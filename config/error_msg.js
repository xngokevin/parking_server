var msg = {}

msg.global = {
	error: {
		status: 500,
		message: "An internal server error occurred. Please try again later."
	},
	no_token: {
		status: 404,
		message: "Missing token. Please login again."
	},
	invalid_token: {
		status: 400,
		message: "Failed to authenticate token. Please login again."
	}
}


//User route
msg.user = {
	//Login
	login: {
		status: 500,
		message: "An error occured logging in. Please try again later."
	},
	login_no_email: {
		status: 404,
		message: "Missing email address."
	},
	login_no_password: {
		status: 404,
		message: "Missing password."
	},
	login_no_user: {
		status: 404,
		message: "Incorrect email or password. Please try again."
	},
	login_incorrect_password: {
		status: 400,
		message: "Incorrect password. Please try again."
	},

	//Register
	register: {
		status: 500,
		message: "An error occurred creating the user. Please try again later."
	},
	register_no_email: {
		status: 404,
		message: "Missing email address."
	},
	register_no_first_name: {
		status: 404,
		message: "Missing first name."
	},
	register_no_last_name: {
		status: 404,
		message: "Missing last name."
	},
	register_no_password: {
		status: 404,
		message: "Missing password."
	},
	register_exists: {
		status: 409,
		message: "This email is in use. Please use a different email."
	}
}

msg.stripe = {
	customer_create: {
		status: 500,
		message: "An error occurred creating the customer. Please try again later."
	},
	customer_no_email: {
		status: 404,
		message: "Missing email address."
	},
	card_retrieve: {
		status: 500,
		message: "An error occurred retrieving card information. Please try again later."
	},
	card_create: {
		status: 500,
		message: "An error occurred adding the card information. Please try again later."
	},
	charge_create: {
		status: 500,
		message: "An error occurred creating the charge. Please try again later"
	},
	no_parking_id: {
		status: 404,
		message: "Missing parking id"
	},
	no_parking_hours: {
		status: 404,
		message: "Missing parking hours"
	},
	no_location_id: {
		status: 404,
		message: "Missing location ID"
	},
	parking_occupied: {
		status: 403,
		message: "Parking spot is currently occupied"
	}
}

module.exports = msg;