const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json')
const beeMovie = require('./beeMovieScript.json')
const fs = require('fs');
let non_christian_words = [];

client.on('ready', () => {
  console.log('Beam me up Scotty!');
  //retrieveNonChristianWords();
});

client.on('message', message => {
  if (message.author.bot) return;

  const m = message.content.toLowerCase().trim();

  if(m.indexOf(':') !== -1) {
    let guildID = message.guild.id;
    retrieveNonChristianWords(guildID)

    const args = m.slice(m.indexOf(':')+1, m.length).split(',');
    const command = m.slice(0, m.indexOf(':'));
    console.log('ARGS LENGTH: ' + args.length);
    console.log('COMMAND: ' + command)

    if (message.member.permissions.has("ADMINISTRATOR")) {
      //console.log("Member is owner: " + (message.member === message.guild.owner))
      if(command === "bee_movie_script" && message.member === message.guild.owner){
        message.channel.send("Give me a sec...");
        let script = beeMovie.script.split('');
        //console.log(script.length)
        let scriptPieces = [];
        let lettercount = 0;
        let mes = '';
        for(let i = 0; i < script.length; i++) {
          if (lettercount % 10000 === 0 && lettercount !== 0) {
            message.channel.send("Letter Count: " + lettercount)
          }
          if (lettercount < 2000 && i < script.length - 1) {
            mes += script[i]
            //console.log(script[i])
            lettercount += 1;
          } else {
            if (i === script.length - 1) {
              mes += script[i]
            }
            scriptPieces.push(mes);
            mes = script[i];
            lettercount = 1;
          }
        }
        for(i = 0; i < scriptPieces.length; i++) {
          if (scriptPieces[i] !== '') {
            message.channel.send(scriptPieces[i]);
          }
        }
        return;
      }
      if(command === "unban") {
        if(args.length > 0) {
          let unbanned_words = [];
          for(let i = 0; i < args.length; i++) {
            unbanned_words.push(args[i].trim())
          }
          let real_unbaned_words = [];
          for(let i = 0; i < non_christian_words.length; i++) {
            if(unbanned_words.indexOf(non_christian_words[i]) !== -1) {
              real_unbaned_words.push(non_christian_words[i]);
              non_christian_words.splice(i, 1);
              i -= 1;
            }
          }
          if(real_unbaned_words.length > 0) {
            let words_to_write = non_christian_words.join('|');
            fs.writeFile(`./${guildID}.txt`, words_to_write, function(err) {
              if(err) {
                message.channel.send('There was an error unbanning the words.')
              }
              retrieveNonChristianWords(guildID);
              message.channel.send('Okay the following words have been unbanned: **' + real_unbaned_words.join(', ') + '**')
            }); 
          } else {
            message.channel.send('Hmm... looks like none of those words are currently banned.')      
          }
        } else {
          message.channel.send("Hmmm... It seems you didn't give me a word to unban")
        }
      }
      if(command === "ban") {
        if(args.length > 0) {
          let banned_words = [];
          for(let i = 0; i < args.length; i++) {
            banned_words.push(args[i].trim())
          }
          for(let i = 0; i < banned_words.length; i++) {
            if(non_christian_words.indexOf(banned_words[i]) !== -1) {
              banned_words.splice(i, 1);
              i -= 1;
            }
          }
          let words_to_write = non_christian_words.concat(banned_words).join('|');
          fs.writeFile(`./${guildID}.txt`, words_to_write, function(err) {
            if(err) {
              message.channel.send('There was an error saving the banned words.')
            }
            retrieveNonChristianWords(guildID);
            message.channel.send('Okay the following words have been banned: **' + banned_words.join(', ') + '**')
          }); 
        } else {
          message.channel.send("Hmmm... It seems you didn't give me a word to ban")
        }
      }
      if(command === "list all") {
        if(non_christian_words.length > 0) {
          message.channel.send('Okay the following word(s) are currently banned: **' + non_christian_words.join(', ') + '**')
        } else {
          message.channel.send("There currently aren't any banned words.")
        }
      }
      if(command === "set timeout") {
        config.deleteTimeout = parseInt(args[0])
        console.log(JSON.stringify(config))
        fs.writeFile('./config.json', "" + JSON.stringify(config), () => {
          message.channel.send("Deletion timeout set to " + config.deleteTimeout + ' secs')
        })
      }
      if(command === "help") {
        message.channel.send('**Barry B. Benson Bot Help**\n`ban: words` - bans words after the `:`, use commas to separate words/phrases\n`unban: words` - unbans words  after the `:` if they are currently in ban list, use commas to separate words/phrases\n`list all:` - lists all currently banned words\n`set timeout: number` - sets bot message tiemout in seconds\n`help:` - dsiplays this help screen')
      }
    }
  }

  let banned_words_used = [];
  for(let word of non_christian_words) {
    if(message.content.toLowerCase().includes(word)) {
      banned_words_used.push(word);
    }
  }
  if(banned_words_used.length > 0) {
    console.log(message.toString())
    message.channel.send(message.author.toString() + ", it seems you used banned word(s): **" + banned_words_used.join(', ') + "**. This is a **Christian discord server** and we'd appreciate if you didn't use those words. Your message has been removed for purity.").then(mes => {
      message.delete()
      message.channel.send({
        files: [{
          attachment: './cds.png',
          name: 'CHRISTIAN DISCORD SERVER PLEASE.jpg'
        }]
      }).then(mes => {
        mes.delete(config.deleteTimeout*1000).catch(err => {
          console.log(err)
        })
      })
      mes.delete(config.deleteTimeout*1000).catch(err => {
        console.log(err);
      })
    })
  }
});

client.login(process.env.TOKEN);

function retrieveNonChristianWords(guildID) {
  if (!fs.existsSync(`./${guildID}.txt`)) {
    fs.writeFileSync(`./${guildID}.txt`, '');
  }
  non_christian_words = fs.readFileSync(`./${guildID}.txt`, { encoding: 'utf8' }).split('|').filter(String);
  //console.log(non_christian_words)
}
