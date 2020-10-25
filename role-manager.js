function parseRoles(req, res, next) {
    let roles = [];

    if (req.user) {
        if (req.user.roles) {
            roles = req.user.roles;
        }
    }

    req.roles = roles;
    next();
}

module.exports = parseRoles;