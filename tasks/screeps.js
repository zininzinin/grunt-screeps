/*
 * grunt-screeps
 * https://github.com/screeps/grunt-screeps
 *
 * Copyright (c) 2015 Artem Chivchalov
 * Licensed under the MIT license.
 */

'use strict';

var path = require('path'),
    https = require('https'),
    util = require('util');



module.exports = function(grunt) {

    grunt.registerMultiTask('screeps', 'A Grunt plugin for commiting code to your Screeps account', function() {

        var options = this.options({});
        if (options.private) {
            https = require('http');
        }
        var modules = {};

        var done = this.async();

        this.files.forEach(function(f) {
            if (!f.src.length) {
                grunt.log.error('No files found. Stopping.');
                done();
                return;
            }

            f.src.filter(function(filepath) {
                if (!grunt.file.exists(filepath)) {
                    grunt.log.warn('Source file "' + filepath + '" not found.');
                    return false;
                } else {
                    return true;
                }
            }).map(function(filepath) {
                var name = path.basename(filepath).replace(/\.js$/, '');
                modules[name] = grunt.file.read(filepath);
            });

            var reqOptions = {
                hostname: options.hostname,
                port: options.port,
                path: options.private ? '/api/codepush' : (options.ptr ? '/ptr/api/user/code' : '/api/user/code'),
                method: 'POST',
                auth: options.email + ':' + options.private ? '' : options.password,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                }
            };

            var req = https.request(reqOptions, function(res) {
                res.setEncoding('utf8');

                var data = '';

                if (res.statusCode < 200 || res.statusCode >= 300) {
                    grunt.log.error('Screeps server returned error code ' + res.statusCode);
                    // grunt.log.error('Here is the msg body:');
                    // grunt.fail.fatal('');
                    grunt.fail.fatal(Object.keys(res));
                }

                res.on('data', function(chunk) {
                    data += chunk;
                });

                res.on('end', function() {
                    try {
                        var parsed = JSON.parse(data);
                        if (parsed.ok) {
                            var msg = 'Committed to Screeps account "' + options.email + '"';
                            if (options.branch) {
                                msg += ' branch "' + options.branch + '"';
                            }
                            if (options.ptr) {
                                msg += ' [PTR]';
                            }
                            msg += '.';
                            grunt.log.writeln(msg);
                        } else {
                            grunt.log.error('Error while commiting to Screeps: ' + util.inspect(parsed));
                        }
                    } catch (e) {
                        grunt.log.error('Error while processing json: ' + e.message);
                    }
                    done();
                });
            });

            var postData = { modules: modules };
            if (options.branch) {
                postData.branch = options.branch;
            }
            // grunt.log.writeln(JSON.stringify(postData));
            if (options.private) {
                postData.email = options.email;
                postData.password = options.password;
            }
            req.write(JSON.stringify(postData));
            req.end();
        });
    });

};