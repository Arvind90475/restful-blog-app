const express = require("express"),
app = express(),
bodyParser = require("body-parser"),
methodOverride = require("method-override"),
expressSanitizer = require("express-sanitizer"),
passport = require("passport"),
LocalStrategy = require("passport-local"), 
passportLocalMongoose = require("passport-local-mongoose"), 	
mongoose = require("mongoose");


app.set("view engine","ejs");
app.use(express.static("public")); 
app.use(bodyParser.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.use(expressSanitizer());


// mongoose config for warning
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);


const url = process.env.DATABASEURL || "mongodb://localhost/restful_blog_appImproved" ;

// //for local setup
// mongoose.connect("mongodb://localhost/restful_blog_appImproved", () => {
//     console.log("Connected to Local DB");
// });

//for hosted DB
mongoose.connect(url, {
	useNewUrlParser: true,
	useCreateIndex: true
}).then(() => {
	console.log('Connected to Hosted DB');
}).catch(err => {
	console.log('ERROR:', err.message);
});


const UserSchema = new mongoose.Schema({
	username: String,
	password: String
});

UserSchema.plugin(passportLocalMongoose);
const User = mongoose.model("User",UserSchema);



//PASSPORT CONFIGURATION
app.use(require("express-session")({
 	secret: "once again rusty wins cute dogs",
 	resave: false,
 	saveUninitialized: false
 }));

app.use(passport.initialize());
app.use(passport.session());
 
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


//middleware for sending user to each template for toggling logout login
app.use(function(req, res, next){
	res.locals.currentUser = req.user;
	next();
})

const blogSchema = new mongoose.Schema({
    title: String,
    image: String,
    body: String,
    created: {type: Date, default: Date.now},
	author:{
		id:{
			type: mongoose.Schema.Types.ObjectId,
			ref : "User" // refers to model which we want to refer

		},	
		username: String 
	}
});





const Blog = mongoose.model("Blog", blogSchema);





// Routes
app.get("/",function(req, res){
    res.redirect("/blogs");
});

//Home route
app.get("/blogs", function(req, res){
	//fetch all data from db
	Blog.find({},function(err, blogs){
        if (err) {
            console.log("ERROR!");
        }else{
            res.render("index",{blogs : blogs});
        }
    });
    
});



// NEW route
app.get("/blogs/new", isLoggedIn, function(req, res){
   res.render("new");
});

// Create route
app.post("/blogs", isLoggedIn, function(req, res){
    //create blog
	req.body.blog.body = req.sanitize(req.body.blog.body);
	addedBlog = {
	title  : req.body.blog.title,
	image  : req.body.blog.image,
	body   : req.body.blog.body,
	author : {		
		    id: req.user._id,
		    username: req.user.username
		     }
	};
    Blog.create(addedBlog,function(err, newBlog){
        if (err) {
			console.log(err)
            res.render("new");
        }else{
            //add username and id to blogs
			// Blog.author.id = req.user._id;
			// Blog.author.username = req.user.username;
			// Blog.save();
			console.log(Blog.find({}));
			//save blogs
			// then redirect tho index
            res.redirect("/blogs");
        }
    });
});
//auth routes


app.get("/register", function(req, res){
	res.render("register");
});





//handle sign up logic
app.post("/register", function(req, res){
    const newUser = new User({username: req.body.username});
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            console.log(err);
            return res.render("register");
        }
        passport.authenticate("local")(req, res, function(){
			res.redirect("/blogs"); 
        });
    });
});

//Login Routes

app.get("/login", function(req, res){
	res.render("login");
})

//handle login logic
app.post("/login", passport.authenticate("local",
	{
	successRedirect: "/blogs",
	failureRedirect: "/login"
	}), function(req, res){
});


//Logout Routes

app.get("/logout", function(req, res){
	req.logout();
	res.redirect("/blogs");
})



//show route
app.get("/blogs/:id", function(req, res){
    Blog.findById(req.params.id, function(err, foundBlog){
        if (err) {
            console.log("ERROR");
        }else{
            res.render("show",{blog: foundBlog});
        }
    });
});


//EDIT ROUTE

app.get("/blogs/:id/edit",isLoggedIn, function(req, res){
    Blog.findById(req.params.id, function(err, foundBlog){
        if (err) {
            res.redirect("/blogs");
        }else{
            res.render("edit",{blog: foundBlog});
        }
    });
});

//UPDATE ROUTE
app.put("/blogs/:id", isLoggedIn, function(req, res){
    req.body.blog.body = req.sanitize(req.body.blog.body);
    Blog.findByIdAndUpdate(req.params.id, req.body.blog, function(err, updatedBlog){
        if (err) {
            res.redirect("/blogs");
        }else{
            //redirect to show route
            res.redirect("/blogs/"+ req.params.id);
        }
    });
});

//DELETE ROUTE
app.delete("/blogs/:id", isLoggedIn, function(req, res){
    Blog.findByIdAndRemove(req.params.id, function(err){
        if (err) {
            res.redirect("/blogs");
        }else{
            res.redirect("/blogs");
        }
    });
});


//admin route
app.get("/admin", function(req, res){
	res.redirect("/blogs");
})



function isLoggedIn(req, res, next){
	if(req.isAuthenticated()){	
		return next();
	}else{
	res.redirect("/login");	
	}
}






const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Our app is running on port ${ PORT }`);
    console.log('Blog App server has started');
});