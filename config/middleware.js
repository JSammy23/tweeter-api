exports.ensureAdminOrSelf = (req, res, next) => {
    if (req.user.role === 'admin' || req.user.id === req.params.id) {
        return next();
    } else {
        return res.status(403).json({ message: 'Unauthorized' });
    }
};

exports.ensureAdmin = (req, res, next) => {
    if (req.user.role === 'admin') {
        return next();
    } else {
        return res.status(403).json({ message: 'Unauthorized' });
    };
};