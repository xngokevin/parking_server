var config = {}


config.token_secret= "test";
config.parking_db = {
	host: '104.198.99.166',
	user: 'parking_server',
	password: 'testicicles',
	database: 'online_parking_database'
}

config.smtp_transport = {
    service: 'gmail',
    auth: {
        user: 'onlineparkingseniordesign@gmail.com',
        pass: 'testicicles'
    }
}

config.stripe_test_key = "sk_test_BQT21ldl57cgA5wN9BmUl4E9";
config.stripe_live_key = "sk_live_1bdO8r04BkwIIE48mCKcf7Dy";

module.exports = config;