/**
 * Created by Juha on 4/20/2017.
 */
var express=require('express');
var router=express.Router();
var path = require('path');

//loki kaikille reiteille:
router.use('*',function(req,res,next){
    var separ=path.sep;
    console.log('separ: ',separ);
    var huuhaa=req.url.split(separ);
    console.log('huuhaa: ',huuhaa);
    console.log('router req.url: ',req.url,' time: ',Date(Date.now()));

    next();
});
//juurihakemiston reitti:
router.get('./urllist.txt',function(req,res){
    console.log('luvaton reitti: ',req.url);
    res.redirect('/');
});

module.exports=router;