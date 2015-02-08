// This module is designed to be a simple back end component for user authentication
//      but is considered incomplete on its own.
//
// This module prvoides:
//  Basic user email and password storage and hashing and verification backed by knex compatible
//      SQL DB.
//
// This module does not provide:
//  Session management.
//  Credential validation (i.e. email validation)
//  Password reset ability.

(function(){

var _ = require('underscore')
var async = require('async')
var bcrypt = require('bcrypt')

var errorCodes = {
    '1': 'A user with that email already exists.',
    '2': 'Unable to find user.',
    '3': 'Password is incorrect.',
    '4': 'New password can not be the same as the old password.'
}

/**

Options include:
    knexObject,
    tableName,
    useCache

*/
module.exports = function(options, callback){

    if( !options.knex || !options.tableName ){
        callback(newError('Incorrect arguments passed to Login on initialization.'));
        return;
    }

    var self = this

    self.knex = options.knex
    self.tableName = options.tableName

    this.init = function(){
        // check if table exists
        self.knex.schema.hasTable(self.tableName)
            .then(function(exists) {
                if( !exists ){
                    // create the table
                    self.knex.schema.createTable(self.tableName, function(table){
                        table.increments()
                        table.string('email').index().unique()
                        table.string('password')
                    })
                    .then(function(){ callback(); })
                    .catch(callback)
                } else { callback(); }
            })
            .catch(callback)
    }

    // options object should include email and password
    // passes back a response object with status, code (on failure), and message (on failure)
    this.checkPassword = function(options, callbackIn){

        // lookup user
        self.getUser(options.email, function(err, userIn){
            if( err ){
                callbackIn(err);
                return;
            }

            // confirm user was returned
            if( userIn.length !== 1 ){
                callbackIn(null, self.getError(2))
                return;
            }
            var user = userIn[0];
            // compare passwords

            bcrypt.compare(options.password, user.password, function(err, res) {
                if( err ){
                    callbackIn(err);
                    return;
                }
                if( res !== true ){
                    callbackIn(null, self.getError(3))
                } else {
                    callbackIn(null, self.getSuccess())
                }
                
            });
        })
    }

    this.getError = function(errorCode){
        return({
            status: 'failure',
            code: errorCode.toString(),
            message: errorCodes[errorCode.toString()]
        })
    }

    this.getSuccess = function(){ return { status: 'success'} }

    // gets user from email, passes back array (one element if found else empty)
    this.getUser = function(email, callbackIn){
        // lookup user
        self.knex(self.tableName)
            .where({'email': email})
            .then(function(userIn){ callbackIn(null, userIn); })
            .catch(callbackIn)

    }

    // options object should include email and password
    // passes back a response object with status, code (on failure), and message (on failure)
    this.create = function(options, callbackIn){
        // test if user already exists
        self.knex(self.tableName)
            .where({email: options.email})
            .then(function(user){
                if( user.length !== 0 ){
                    callbackIn(null, self.getError(1))
                    return;
                }
                self.createUser(options, callbackIn)
            })
            .catch(callbackIn)
    }

    this.createUser = function(options, callbackIn){
        // hash password
        bcrypt.hash(options.password, 8, function(err, hash) {
            if( err ){
                callbackIn(err)
                return
            }

            // save user
            self.knex(self.tableName)
                .insert({email: options.email, password: hash})
                .then(function(){
                    callbackIn(null, self.getSuccess())
                })
        });
    }

    this.deleteUser = function(email, callbackIn){
        self.knex(self.tableName)
            .where({'email': email})
            .del()
            .then(function(){ callbackIn(); })
            .catch(callbackIn)
    }


    // takes options with email and password (new password)
    // passes back a response object
    this.updatePassword = function(options, callbackIn){

        // lookup user
        self.getUser(options.email, function(err, userIn){
            if( err ){
                callbackIn(err);
                return;
            }

            // confirm user was returned
            if( userIn.length !== 1 ){
                callbackIn(null, self.getError(2))
                return;
            }
            var user = userIn[0];
            // compare passwords
            bcrypt.compare(options.password, user.password, function(err, res) {
                if( err ){
                    callbackIn(err);
                    return;
                }
                if( res === true ){
                    callbackIn(null, self.getError(4))
                } else {

                    // get hash of new password
                    bcrypt.hash(options.password, 8, function(err, hash) {
                        if( err ){
                            callbackIn(err)
                            return
                        }
                        self.knex(self.tableName)
                            .where({email: options.email})                            
                            .update({password: hash})
                            .then(function(){
                                callbackIn(null, self.getSuccess())
                            })
                            .catch(callbackIn)
                    })
                }                
            });
        })
    }

    this.init();

};

}())