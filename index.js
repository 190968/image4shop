
var fs = require("fs");
var http = require("http");
var path = require("path");
var cors = require("cors");
var express = require("express");
var formidable = require("formidable");
var csvToJson = require('convert-csv-to-json');
var Mongoclient = require("mongodb").MongoClient;

var app = express();
var nodemailer = require('nodemailer');


app.set('view engine', 'pug');

app.set('views', path.join(__dirname, 'views'));

app.use(cors());

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", '*');
  res.header("Access-Control-Allow-Credentials", true);
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
  next();
});

const port = process.env.PORT||5000;
// 



// send answer to user mail
app.get("/send_answer",(req,res)=>{
  var email = req.query.email; 
  var name = req.query.name;
  var answer = req.query.answer;
  var answer = req.query.pass;
  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: '19ham09@gmail.com',
      pass: pass
    }
  });
  var mailOptions = {
    from: '19ham09@gmail.com',
    to: email,
    subject: 'This is answer from ALLforRUN.by',
    text: `<h1>Hello ${name} this is ALLforRUN.by. This is my answer ${answer} </h1>`
  };
  
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {

      Mongoclient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true },function(err, db){
        if ( err ) throw err;
        var dbo = db.db("my");       
          dbo.collection("questions").updateOne({ "email" : email },{$set:{"answer": answer}},{ upsert: true },(err)=>{
            if ( err ) throw err;
            const s = dbo.collection("questions").find().toArray((err,data)=>{
              if ( err ) throw err;
          

          res.render('question',{ base:data, url:app.locals.url });
        });
      });           
      });
    }
  });   
});


//  Main page
app.get("/",function(req,res) {
  app.locals.url =  port == 5000 ? req.protocol +'://' + req.hostname +  `:${port}`:
    req.protocol +'://' + req.hostname; 
  let s =  fs.readdirSync((__dirname + "/items")); 
  res.render('main_page',{ folders: s, url: app.locals.url});
}); 


//pug CreateFolder
app.get("/createFolder",(req,res)=>{
  let name = req.query.name;
  if (name == undefined) {
  res.render('pug',{exit: app.locals.url} )
  } else {
    fs.mkdir((__dirname + `/items/${name}`),function(err){
      if (err) {
        res.send(`<h1>${err}</h1>`)
      } else {
        res.redirect("/");
      }     
    })
  }
});

// pug form  for upload image
app.get("/upload_image",(req,res)=>{ 
  let brand = req.query.brand;
  let model = req.query.model;
  let number = req.query.number; 
  let s =  fs.readdirSync((__dirname + "/items"));  
  res.render('upload_image',{exit: app.locals.url, brand: brand, folders: s, model: model,number: number} )
});  



app.post("/upload_image/uploadimage",(req,res)=>{  
  let brand = req.query.brand;
  let model = req.query.model;
  let number = req.query.number;
  console.log(`${brand}  and  ${model}`);   
  var form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {   
    var oldpath = files.imageupload.path;
    var name = files.imageupload.name;
    var type = name.substr(name.indexOf('.'),20);
    console.log(model + number + type);
    var newpath = path.join( __dirname,'items',brand,model + number + type);
    fs.copyFile(oldpath, newpath, function (err) {   
      if (err) {
        res.send(`<h1>${err}</h1>`)
      } else {
        res.redirect(`/readBase/?brand=${brand}`);
      }     
    })
  });
});

// Rename folder
app.get("/rename",(req,res)=>{
  let name = req.query.name;
  let last_name = req.query.last_name;
   fs.rename(path.join(__dirname,'items',last_name),path.join(__dirname,'items',name),(err)=>{
    if (err) throw err
    res.redirect('/');
  }) 
});


//connect to MongoDB

const uri = "mongodb+srv://alex:alex@cluster0alex-mvffj.gcp.mongodb.net/my?retryWrites=true";
// app.use(bodyParser.json({ inflate: true, limit: '2000kb', type: 'txt/csv'}));

// write to mongodb
app.get('/add_to_mongobase',(req,res)=>{
  Mongoclient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true },function(err, db){
      if ( err ) throw err;
      var dbo = db.db("my");
      dbo.collection('base').deleteMany({},(err)=>{
        if (err) throw err;
        console.log("Base deleted");
        fs.readFile(path.join(__dirname,'base.json'),'utf8',(err,data)=>{           
          if ( err ) throw err;
          dbo.collection('base').insertMany( JSON.parse(data) , (err, res)=>{
            if ( err ) throw err;
            console.log(`inserted: ${res.insertedCount}`);               
          });
        });
      });  
  });
  res.redirect("/");
});

//read questions from mongoDB

app.get("/question",function(req,res){
 
  Mongoclient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true },function(err, db){
    if ( err ) throw err;
    var dbo = db.db("my");       
    const s = dbo.collection("questions").find().toArray((err,data)=>{
      if ( err ) throw err;       
      res.render('question',{ base:data, url:app.locals.url });
    });           
  });
});


//read base  brand from mongoDB 

app.all("/readBase",function(req,res){
  let brand = req.query.brand; 
  Mongoclient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true },function(err, db){
    if ( err ) throw err;
    var dbo = db.db("my");       
    const s = dbo.collection("base").find({ "brand" : brand }).toArray((err,data)=>{
      if ( err ) throw err;       
      res.render('base_brand',{ base:data, url:app.locals.url, brand:brand });
    });           
  });
});
//read base   from mongoDB to shop 

app.all("/readBase_to_shop",function(req,res){
 
  Mongoclient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true },function(err, db){
    if ( err ) throw err;
    var dbo = db.db("my");       
    const s = dbo.collection("base").find({}).toArray((err,data)=>{
      if ( err ) throw err;       
      res.send(data);
    });           
  });
});




//read orders from MongoDB
app.get("/readOrders",function(req,res){
  Mongoclient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true },function(err, db){
    if ( err ) throw err;
    var dbo = db.db("my");       
    const s = dbo.collection("orders").find().toArray((err,data)=>{
      if ( err ) throw err;
      res.render('orders', {data: data});       
    });
  }); 
});

//read orders from MongoDB for user
app.get("/readOrdersForUser",function(req,res){
  let phone = req.query.phone;
  let name = req.query.name; 
  Mongoclient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true },function(err, db){
    if ( err ) throw err;
    var dbo = db.db("my");
    if (name === 'admin' & phone === '99999') {
      const s = dbo.collection("orders").find().limit(10).toArray((err,data)=>{
        if ( err ) throw err;
       
        res.send(data);       
      });
    } else {       
      const s = dbo.collection("orders").find({phone:phone,name:name}).toArray((err,data)=>{
        if ( err ) throw err;
      
        res.send(data);       
      });
    }
  }); 
});

//add order to base MongoDB

app.get("/add_to_order",function(req,res){
 
  let name = req.query.name;
  let phone = req.query.phone;
  let id = req.query.id;
  let brand = req.query.brand;
  let model = req.query.model;
  let gender = req.query.gender;
  let color = req.query.color;
  let quantity = req.query.quantity
  let size = req.query.size;
  let cost = req.query.cost;
 
  Mongoclient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true },function(err, db){
    if ( err ) throw err;
    var dbo = db.db("my");
    var d = new Date();
    var date = d.getFullYear() + "/" + d.getMonth() + "/" + d.getDate() + " " + d.getHours() + ":" + d.getMinutes();   
    var set = { 
              "name": name,
              "phone": phone,
              "id" : +id ,
              "cost": +cost,             
              "brand": brand,
              "model": model,
              "gender": gender,
              "quantity": quantity,
              "color": color,
              "size": size,
              "date":  date        
            };       
    dbo.collection("orders").insertOne(set,(err,date)=>{
      if ( err ) throw err;
       
      res.send("Ok");
    });           
  });
});



//add one item to base
app.get("/add_to_base_item",function(req,res){
  let id = 1000;
  let brand = req.query.brand;
  let model = req.query.model;
  let gender = req.query.gender;
  let color = req.query.color;
  let size = req.query.size;
  let cost = req.query.cost;
  let sale = req.query.sale;
  Mongoclient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true },function(err, db){
    if ( err ) throw err;
    var dbo = db.db("my");
    var set = { "id" : +id ,
              "cost": +cost,
              "sale": +sale,
              "brand": brand,
              "model": model,
              "gender": gender,
              "color": color,
              "size": size             
            };       
    dbo.collection("base").insertOne(set,(err,date)=>{
      if ( err ) throw err;
      console.log(date);       
      res.redirect(`/readBase?brand=${brand}`);
    });           
  });
});


//add question to mongoDB

app.get("/write_question",function(req,res){ 
  let name = req.query.name;
  let email = req.query.email;
  let question = req.query.question;
  Mongoclient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true },function(err, db){
    if ( err ) throw err;
    var dbo = db.db("my");
    var today = new Date();
    var set = { 
              "date": today.getFullYear() + "/" + (today.getMonth() + 1)
               + "/" + today.getDate() + " " +today.getHours()+":"+today.getMinutes() ,
              "name": name,
              "email": email,
              "question": question,
            };       
    dbo.collection("questions").insertOne(set,(err,date)=>{
      if ( err ) throw err;        
      res.send("good");
    });           
  });
});

//delete question from mongodb

app.get("/delete_question",function(req,res){
 
 
  let email = req.query.email;
  
  Mongoclient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true },function(err, db){
    if ( err ) throw err;
    var dbo = db.db("my");
    
    
    dbo.collection("questions").deleteOne({"email" : email},(err)=>{
      if ( err ) throw err;        
      res.redirect("/question");
    });           
  });
});

//update item in base
app.get("/write_to_base",function(req,res){
  let id = req.query.id;
  let brand = req.query.brand;
  let cost = req.query.cost;
  let sale = req.query.sale;
  let size = req.query.size;
  Mongoclient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true },function(err, db){
    if ( err ) throw err;
    var dbo = db.db("my");       
    dbo.collection("base").updateOne({ "id" : +id },{$set:{"size": size,"cost": +cost,"sale": +sale}},{ upsert: true },
    (err,date)=>{
      if ( err ) throw err;
      console.log(date.result.nModified);       
      res.redirect(`/readBase?brand=${brand}`);
    });           
  });
});


//uploadBase
app.post("/uploadBase",(req,res)=>{  
 
  var url =  port == 5000 ? req.protocol +'://' + req.hostname +  `:${port}`:
              req.protocol +'://' + req.hostname;
 
  var form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
   
    var oldpath = files.filetoupload.path;
    csvToJson.formatValueByType().getJsonFromCsv(oldpath);

    csvToJson.generateJsonFileFromCsv(oldpath,"new.json");
  
    function convert() {
      var destination = path.join( __dirname,"base.json");
      console.log(destination);
      var source = path.join(__dirname,"new.json");
      fs.copyFile(source, destination, function (err) {   
        if (err) {
          res.send(`<h1>${err}</h1>`)
        } else {
          console.log("Convert complite");
          res.redirect("/add_to_mongobase");
        }     
      })
    };  
    setTimeout(()=> convert(),1000);
  });
});


// pug form  for upload base
app.get("/upload_base",(req,res)=>{  
  res.render('upload_base',{exit: app.locals.url} )
});  



// Page with image
app.get("/items",function(req,res) {
  let brand = req.query.brand;
  let s =  fs.readdirSync((__dirname + `/items/${brand}`));  
  let num = req.query.number || 0;
  let n = num < 0 ? 0 : num > s.length-1 ? s.length-1 : num;
  let to_del = s[n]; 
  let im = s.length !== 0 ? s[n].replace(".jpg","").replace(".webp","") : s[1];   
  res.render('view_image',{ url: app.locals.url, brand: brand, im: im,n: n, image: s});
});  
    
  
   


//  request for send files to site
app.all("/items/*", function(req,res,err) {
  let path = req.path;
  console.log(path);  
  fs.existsSync(__dirname +  path + ".jpg")
  ?  
  res.sendFile(__dirname +  path + ".jpg")
  :
  fs.existsSync(__dirname +  path + ".webp")
  ?
  res.sendFile(__dirname +  path + ".webp") 
  :
  fs.existsSync(__dirname +  path)
  ?
  res.sendFile(__dirname +  path) 
  : 
  res.sendFile(__dirname + '/items/brands/salomon.png') 
   
});

// delete image
app.get("/delete",function(req,res){
  let brand = req.query.brand; 
  let name = req.query.name; 
  fs.unlink((__dirname + `/items/${brand}/${name}`),function(err){
    if (err) throw err;
    res.redirect("/");
    console.log(`file ${name} deleted`);
  });
});







// Resive base from Heroky how file
app.get("/base", function(req,res) {     
     fs.readFile("base.json", function(err,data) { 
         if (err) throw err;       
        res.send(data);
    });
});

app.listen(port, (err)=>{
  if ( err ) { return  console.log("Error");
  } else {
      console.log("http server runing");
  }
});