(function(){

var _ = require('underscore')
var CronJob = require('cron').CronJob;

var userLoginSchema = function(table){
    table.integer('user')
    table.integer('post')
    table.integer('created')    
    table.primary(['user', 'post']) 
}

var settings = {
    postTimeLimit: 60 * 60 * 24 * 30 // 30 days worth of seconds
}

module.exports = function(options, callback){

    var self = this

    self.knex = options.knex
    self.tableName = options.tableName

    this.init = function(){

        self.knex.schema.hasTable(self.tableName)
            .then(function(exists) {
                if( !exists ){
                    // create the table
                    self.knex.schema.createTable(self.tableName, userLoginSchema)
                        .then(function(){
                            callback();
                            var CronJob = require('cron').CronJob;
                            // clean log every day at 1am
                            var job = new CronJob('0 1 * * *', function(){
                                    self.cleanLog(function(err){
                                        if( err ){ console.log(err) }
                                    });
                                }, function () {
                                    // This function is executed when the job stops
                                },
                                true, /* Start the job right now */
                                'America/Los_Angeles' /* Time zone of this job. */
                            );
                        })
                        .catch(callback)

                } else { callback(); }
            })
            .catch(callback)
    }

    this.cleanLog = function(callback){
        var maxTimeAge = self.getMaxTimeAge()
        self.knex(self.tableName)
            .where('created', '<', maxTimeAge)
            .delete()
            .then(function(){ callback() })
            .catch(callback)
    }

    this.getCurrentTime = function(){
        return Math.floor(Date.now()/1000);
    }

    this.log = function(userId, postId, callback){
        // confirm log does not already exist
        self.knex(self.tableName)
            .where({user: userId, post: postId})
            .then(function(rows){
                if( rows.length !== 0 ){
                    callback()
                    return;
                }
                // add new log
                self.knex(self.tableName)
                    .insert({ user: userId, post: postId, created: self.getCurrentTime() })
                    .then(function(){ callback(); })
                    .catch(callback)
            })
            .catch(callback)
    }

    this.getLog = function(userId, callback){
        var maxTimeAge = self.getMaxTimeAge()
        self.knex(self.tableName)
            .select(['post'])
            .where('user', userId)
            .andWhere('created', '>', maxTimeAge)
            .then(function(rows){
                postIds = _.map(rows, function(row){
                    return row.post
                })
                callback(null, postIds)
            })
            .catch(callback)
    }

    this.getMaxTimeAge = function(){
        return self.getCurrentTime() - settings.postTimeLimit
    }

    this.init()

};


}())