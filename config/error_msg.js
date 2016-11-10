var msg = {

	global_error: {
		status: 500,
		message: "An internal server error occurred. Please try again later."
	},

	//User route
	user_no_email: {
		status: 404,
		message: "Missing email address."
	},
	user_no_first_name: {
		status: 404,
		message: "Missing first name."
	},
	user_no_last_name: {
		status: 404,
		message: "Missing last name."
	},
	user_no_password: {
		status: 404,
		message: "Missing password."
	},
	user_create: {
		status: 500,
		message: "An error occurred creating the user. Please try again later."
	},
	user_exists: {
		status: 409,
		message: "This email is in use. Please use a different email."
	}

}

module.exports = msg;