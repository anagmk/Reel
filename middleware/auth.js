const checkSession = ((req,res,next) => {
    // prevent cached pages from being shown after logout
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    if(req.session.user){
        next()
    }else{
        res.redirect('/user/login')
    }
});

const isLogin = ((req,res,next) => {
    // don't allow cached login redirect to show after logout
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    if(req.session.user){
        res.redirect('/user/home');
    }else{
        next();
    }
});

const checkAdminSession = ((req,res,next) => {
    // set no-cache headers so protected admin pages are not stored in browser cache
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    if(req.session.admin){
        next();
    }else{
        res.redirect('/admin/login');
    }
});

const checkAdminRole = (requiredRole) => (req, res, next) => {
    if (!req.session.admin) return res.redirect('/admin/login');
    const role = req.session.adminRole || 'developer';
    if (role === requiredRole || role === 'developer') return next();
    return res.status(403).send('Forbidden');
};

module.exports = { 
    checkSession,
    isLogin, 
    checkAdminSession 
    , checkAdminRole
};