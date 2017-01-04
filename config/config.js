var config = {}


config.token_secret= "test";
config.local_db = {
	host: '104.196.234.251',
	user: 'parking_server',
	password: 'testicicles',
	database: 'online_parking_database'
}


config.stripe_test_key = "sk_test_BQT21ldl57cgA5wN9BmUl4E9";
config.stripe_live_key = "sk_live_1bdO8r04BkwIIE48mCKcf7Dy";

module.exports = config;