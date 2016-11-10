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
	}
}

module.exports = msg;