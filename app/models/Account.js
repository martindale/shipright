var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.SchemaTypes.ObjectId
  , passportLocalMongoose = require('passport-local-mongoose')
  , slug = require('mongoose-slug')
  , crypto = require('crypto');

// this defines the fields associated with the model,
// and moreover, their type.
var AccountSchema = new Schema({
    username: { type: String, required: true }
  , emails:   [ { type: String, required: true } ]
  , image: {
        url: { type: String, default: '/img/user-avatar.png' }
      , small: { type: String, default: '/img/user-avatar.png' }
    }
  , created:  { type: Date, required: true, default: Date.now }
  , _actor:   { type: ObjectId, ref: 'Actor' }
  , profiles: {
      google: [ new Schema({ id: String , email: String }) ]
    }
});

// attach the passport fields to the model
AccountSchema.plugin(passportLocalMongoose);

// attach a URI-friendly slug
AccountSchema.plugin( slug( 'username' , {
  required: true
}) );

AccountSchema.virtual('images').get(function() {
  
  return this.emails.map(function(email) {
    var hash = crypto.createHash('md5').update( email ).digest('hex');
    return {
      address: email,
      image: 'https://secure.gravatar.com/avatar/' + hash + '?s=20'
    }
  });

  return config.git.data.path + '/' + this._id;
});

AccountSchema.statics.lookup = function( string , cb ) {
  var emails = string.match(/\<(.*)\>$/);
  Account.findOne({
    $or: [
      { emails: emails[1] },
      { email: emails[1] }
    ]
  }).exec( cb );
}

AccountSchema.post('init', function() {
  if (!this.image || !this.image.url) this.save();
});

AccountSchema.pre('save', function(next) {
  var self = this;
  
  var DEFAULT_AVATAR = '/img/user-avatar.png';

  if (!this.image || !this.image.url || this.image.url == DEFAULT_AVATAR) {
    var email = self.email;
    if (!email && self.emails.length) email = self.emails[ 0 ];

    if (email) {
      email = email.toLowerCase();

      var hash = crypto.createHash('md5').update( email ).digest("hex");
      this.image = {
          url: 'https://secure.gravatar.com/avatar/' + hash + '?s=300'
        , small: 'https://secure.gravatar.com/avatar/' + hash
      }
    } else {
      this.image.url = DEFAULT_AVATAR;
    }
  }

  if (typeof(this._actor) == 'undefined' || !this._actor) {
    var actor = new Actor({
        type: 'Person'
      , target: self._id
      , slug: self.slug
    });
    this._actor = actor._id;

    actor.save( function(err) {
      if (err) { console.log(err); }
      next(err);
    });
  } else {
    next();
  }
});

var Account = mongoose.model('Account', AccountSchema);

// export the model to anything requiring it.
module.exports = {
  Account: Account
};
