const Discord = require('discord.js');
const ytdl = require('ytdl-core')
const request = require('superagent')
const client = new Discord.Client();
const config = require('./config.json')
const beeMovie = require('./beeMovieScript.json')
const fs = require('fs');
const moment = require('moment');
require('dotenv').config();

let non_christian_words = [];
let voiceChannel = null;
let ytAudioQueue = [];
let playing = false;
let dispatcher;
let announcementChannel = config.announcementChannel;
let tempQueue = [];
let queueing = false;

client.on('ready', () => {
  console.log('Beam me up Scotty!');
  let aChannel = client.channels.find(val => val.name === announcementChannel)
  if(aChannel) aChannel.send("I'm back up from my nap!")
  else client.channels.find(val => val.name.toLowerCase() === "general").send("Please create a text channel for announcements and/or set it using `setAnnouncementChannel`")
});

client.on('message', message => {
  if (message.author.bot) return;

  const m = message.content.trim();

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
        beeMovieScript(message)
        return;
      }
      switch(command) {
        case ("unban"):
          unbanWords(message, args, guildID)
          break;
        case ("ban"):
          banWords(message, args, guildID)
          break;
        case ("listAll"):
          if(non_christian_words.length > 0) {
            message.channel.send('Okay the following word(s) are currently banned: **' + non_christian_words.join(', ') + '**')
          } else {
            message.channel.send("There currently aren't any banned words.")
          }
          break;
        case ("setTimeout"):
          config.deleteTimeout = parseInt(args[0])
          console.log(JSON.stringify(config))
          fs.writeFile('./config.json', "" + JSON.stringify(config), () => {
            message.channel.send("Deletion timeout set to " + config.deleteTimeout + ' secs')
          })
          break;
        case ("help"):
          message.channel.send(config.helpText.join('\n'))
          break;
        case ("join"):
          JoinChannel(args[0], message);
          break;
        case ("play"):
          PlayCommand(args.join(" "), message);
          break;
        case ("resetQueue"):
          ResetMusicQueue();
          break;
        case ("listQueue"):
          ListQueue();
          break;
        case ("skip"):
          SkipSong();
          break;
        case ("setAnnouncementChannel"):
          SetAnnouncementChannel(args[0], message);
          break;
        case ("setMaxVideoTime"):
          SetMaxVideoTime(args[0], message);
          break;
        default:
          message.reply("It seems you have used a command that hasn't been created yet.")
          break;
      }
    }
  }
  checkForBannedWords(message)
});



client.login(process.env.TOKEN);

function checkForBannedWords(message) {
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
}

function beeMovieScript(message) {
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

function unbanWords(message, args, guildID) {
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

function banWords(message, args, guildID) {
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

function JoinChannel(channel, message) {
  if(voiceChannel !== null) {
    console.log('DISCONNECTED FROM VOICE')
    voiceChannel.leave();
  }

  message.reply("Attempting to join channel: " + channel.trim());

  voiceChannel = GetChannelByName(channel.trim());

  if(voiceChannel) {
    console.log('Joining voice channel')
    return voiceChannel.join().then(connection => {
      message.channel.send("Connected to voice channel: " + channel.trim())
    }).catch(err => {
      console.error(err)
    });;
  } else {
    message.reply("Couldn't find channel: " + channel.trim());
    return;
  }
}

function PlayCommand(searchTerm, message) {
  message.channel.send("Searching Youtube for audio...");
  YoutubeSearch(searchTerm, message);
}

function ResetMusicQueue() {
  if(playing) {
    ytAudioQueue.splice(1, ytAudioQueue.length - 1)
  } else {
    ytAudioQueue = []
  }
}

function ListQueue() {
  let queue = playing ? `:headphones: - ${ytAudioQueue[0].title} - ${ytAudioQueue[0].duration.minutes()}:${ytAudioQueue[0].duration.seconds() < 10 ? "0" + ytAudioQueue[0].duration.seconds() : ytAudioQueue[0].duration.seconds()}\nQueue -\n` : '\u1F3A7 - Nothing is playing\nQueue -\n'
  if (ytAudioQueue.length === 1) queue += "No Music Queued"
  for(let i = 1; i < ytAudioQueue.length; i++) {
    let song = ytAudioQueue[i]
    queue += `${i}) ${song.title} - ${song.duration.minutes()}:${song.duration.seconds() < 10 ? "0" + song.duration.seconds() : song.duration.seconds()}\n`
  }
  let channel = client.channels.find(val => val.name === config.announcementChannel)
  if(channel) channel.send(queue)
}

function SkipSong() {
  dispatcher.end();
}

function SetAnnouncementChannel(channel, message) {
  config.announcementChannel = channel;
  fs.writeFileSync('./config.json', "" + JSON.stringify(config), () => {
    message.channel.send("Announcement channel set to " + config.announcementChannel);
  })
}

function SetMaxVideoTime(length, message) {
  config.maxVideoTime = parseInt(length);
  fs.writeFileSync('./config.json', "" + JSON.stringify(config), () => {
    message.channel.send("Max Video Length set to " + config.length + " mins");
  })
}

// Helper functions

function retrieveNonChristianWords(guildID) {
  if (!fs.existsSync(`./${guildID}.txt`)) {
    fs.writeFileSync(`./${guildID}.txt`, '');
  }
  non_christian_words = fs.readFileSync(`./${guildID}.txt`, { encoding: 'utf8' }).split('|').filter(String);
  //console.log(non_christian_words)
}

function GetChannelByName(name) {
  console.log('Finding Voice Channel: ' + name)
  let channel = client.channels.find(val => val.name === name);
  if(channel) {
    console.log('Channel "' + name + '" found')
  }
  return channel;
}

function YoutubeSearch(searchKeywords, message, pageToken) {
  let snippetUrl = pageToken ? `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${escape(searchKeywords)}&key=${process.env.API_KEY}&pageToken=${pageToken}` :
  `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${escape(searchKeywords)}&key=${process.env.API_KEY}`;

  request(snippetUrl, (error, response) => {
      if (!error && response.statusCode == 200) {
          var body = response.body;
          if (body.items.length == 0) {
              message.channel.send("Your search gave 0 results");
              return videoId;
          }
          let reqsSent = 0;
          let reqsRecieved = 0;
          for (var item of body.items) {
              if (item.id.kind === 'youtube#video') {
                let i = item;
                let detailsUrl = `https://www.googleapis.com/youtube/v3/videos?id=${i.id.videoId}&part=contentDetails&key=${process.env.API_KEY}`;
                reqsSent++;
                request(detailsUrl, (error, response) => {
                  reqsRecieved++;
                  //console.log(response)
                  if(!error && response.statusCode == 200) {
                    let duration = moment.duration(response.body.items[0].contentDetails.duration);
                    console.log(`Duration: ${duration.minutes()}:${duration.seconds() < 10 ? "0" + duration.seconds() : duration.seconds()} id: ${i.id.videoId}`)
                    if (duration.minutes() <= config.maxVideoTime && duration.minutes() > 0 && i.snippet.liveBroadcastContent !== "live") {
                      console.log("Queued: " + i.id.videoId);
                      let v = {
                        url: `https://www.youtube.com/watch?v=${i.id.videoId}`,
                        title: i.snippet.title,
                        duration: duration
                      }
                      if(tempQueue.length <= 5) {
                        tempQueue.push(v);
                      }
                      if(reqsRecieved === reqsSent) {
                        if(tempQueue.length <= 5) {
                          YoutubeSearch(searchKeywords, message, body.nextPageToken);
                        } else {
                          QueueYtAudioStream();
                        }
                      }
                    } else {
                      console.error(`Video ${i.id.videoId} is longer than ${config.maxVideoTime} mins or not long enough or live video`);
                    }
                  }
                })
              }
          }
      }
      else {
          console.log("Unexpected error when searching YouTube");
          return null;
      }
  });

  return null;
}

/// Queues result of Youtube search into stream
function QueueYtAudioStream() {
  ytAudioQueue.concat(tempQueue);
  if(!playing) {
    PlayStream(ytAudioQueue[0]);
  }
  tempQueue = [];
}

function PlayStream(video) {
  const streamOptions = {seek: 0, volume: 1, passes: 2, bitrate: 'auto'};
  if (video && !playing) {
    let aChannel = client.channels.find(val => val.name === config.announcementChannel)
    if(aChannel) console.log("Found announcement channel: " + aChannel.name);
    playing = true;
    if(aChannel) {
      aChannel.send('Now Playing: ' + video.title).then(() => {
        console.log("Sent message to announcements")
      }).catch(() => {
        console.error("Couldn't send announcement")
      })
      console.log("Streaming audio from " + video.url);
        const stream = ytdl(video.url, {filter: 'audioonly'});
        dispatcher = client.voiceConnections.first().playStream(stream, streamOptions);
        dispatcher.on('end', () => {
          playing = false;
          ytAudioQueue.shift();
          if(ytAudioQueue.length > 0) {
            PlayStream(ytAudioQueue[0]);
          } else {
            aChannel.send("Finished Music Queue")
          }
          //ListQueue();
        })
    } else {
      console.error("Couldn't connect to announcement channel")
      let channel = client.channels.find(val => val.name.toLowerCase() === "general")
      if(channel) {
        channel.send("Please create an announcement channel and set it")
      }
    }
  }
}

// function fixedFromCharCode(codePt) {
//   if (codePt > 0xFFFF) {
//       codePt -= 0x10000;
//       return String.fromCharCode(0xD800 + (codePt >> 10), 0xDC00 + (codePt & 0x3FF));
//   }
//   else {
//       return String.fromCharCode(codePt);
//   }
// }