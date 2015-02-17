var async = require('async')
var assert = require('assert')

var UserLog = require('../index')

var dbCreds = {
    client: 'mysql',
    connection: {
        host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'sql_login',
        port:  8889
    }
}

var knex = require('knex')(dbCreds)

userId = 1

var userLog = new UserLog({
    knex: knex,
    tableName: 'test_user_log'
}, function(){});

async.waterfall([    

    // clear table
    function(callback){
        knex('test_user_log').truncate()
            .then(function(){ callback(); })
            .catch(callback)
    },

    // create a log entry
    function(callback){
        userLog.log(userId, 777, callback)
    },

    // get user log
    function(callback){
        userLog.getLog(userId, function(err, log){
            if( err ){ callback(err)
            } else {
                assert((log[0] === 777), 'Log not entered.')
            }
        })
    }


], function(err){
    if( err ){
        console.log('Error occured.')
        console.log(err)
    } else {
        console.log('User log test completed successfully.')
    }

})