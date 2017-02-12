var msg = {}

msg.global = {
	global_success: {
		status: 200,
		message: "Success"
	}
}

//User route
msg.user = {
	//Register
	register: {
		status: 200,
		message: "Successfully created user."
	},

	//Verify
	verify: {
		status: 200,
		message: "Successfully activated email address. You may now login."
	}
}

msg.stripe = {
	customer_create: {
		status: 200,
		message: "Successfully created customer."
	},
	card_create: {
		status: 200,
		message: "Successfully created card info."
	},
	card_delete: {
		status: 200,
		message: "Successfully deleted card info."
	},
	charge_create: {
		status: 200,
		message: "Successfully created charge."
	}
}

module.exports = msg;