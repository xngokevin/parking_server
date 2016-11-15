var config = {}


config.token_secret= "test";
config.local_db = {
	host: '127.0.0.1',
	user: 'root',
	password: 'idontng00',
	database: 'parking'
}


config.stripe_test_key = "sk_test_BQT21ldl57cgA5wN9BmUl4E9";
config.stripe_live_key = "sk_live_1bdO8r04BkwIIE48mCKcf7Dy";

module.exports = config;