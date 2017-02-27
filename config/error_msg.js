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
	},

	//Verify
	verify_no_email_key: {
		status: 404,
		message: "Missing email key."
	},
	verify_invalid_email_key: {
		status: 400,
		message: "The link is invalid or expired. Please register again."
	},
	verify_email_activated: {
		status: 400,
		message: "This email has already been activated."
	},

	no_transaction: {
		status: 404,
		message: "No transactions available"
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
	card_delete: {
		status: 500,
		message: "An error occurred deleting the card information. Please try again later."
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
	},
	no_parking_space: {
		status: 404,
		message: "Unable to find parking spot. Please select a different spot."
	}
}

module.exports = msg;