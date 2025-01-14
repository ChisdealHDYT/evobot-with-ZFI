const { MessageEmbed } = require("discord.js");
const { play } = require("../include/play");
const YouTubeAPI = require("simple-youtube-api");
const scdl = require("soundcloud-downloader").default;
const fetch = require('node-fetch');

const {
  YOUTUBE_API_KEY,
  SOUNDCLOUD_CLIENT_ID,
  MAX_PLAYLIST_SIZE,
  DEFAULT_VOLUME,
  LOCALE
} = require("../util/EvobotUtil");
const youtube = new YouTubeAPI(YOUTUBE_API_KEY);
const i18n = require("i18n");

i18n.setLocale(LOCALE);

module.exports = {
  name: "zenzopl",
  cooldown: 5,
  aliases: ["zfipl"],
  description: i18n.__("playlist.description"),
  async execute(message, args) {
    const { channel } = message.member.voice;
    const serverQueue = message.client.queue.get(message.guild.id);

    const search = args.join(" ");
    let reszfi = await fetch('https://api.chisdealhd.co.uk/v1/zenzo/forge/item/'+search.replace(/ /g,"%20"))
    		let body = await reszfi.json();
                  
            	if (!args.length)
      return message
        .reply(i18n.__mf("playlist.usageReply", { prefix: message.client.prefix }))
        .catch(console.error);
    if (!channel) return message.reply(i18n.__("playlist.errorNotChannel")).catch(console.error);

    const permissions = channel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT")) return message.reply(i18n.__("playlist.missingPermissionConnect"));
    if (!permissions.has("SPEAK")) return message.reply(i18n.__("missingPermissionSpeak"));

    if (serverQueue && channel !== message.guild.me.voice.channel)
      return message
        .reply(i18n.__mf("play.errorNotInSameChannel", { user: message.client.user }))
        .catch(console.error);

    const zfiurl = JSON.parse(body[0].metadata);
	
    const zfiyt = zfiurl.audio;        
   
    const zfisc = zfiurl.audio;                
    
    if (!zfiurl.audio && !zfiurl.audio) return message.reply("This Unsupported Zenzo Forge Items (NFI), Make sure its Playlist for SoundCloud or YouTube using `ytpl` & `soundcloudpl` metadata?");
      
    const pattern = /^.*(youtu.be\/|list=)([^#\&\?]*).*/gi;
    
    //if (zfiurl.yt) {
         const url = zfiurl.audio;
    //} else if (zfiurl.soundcloud) {
    //     const url = zfiurl.soundcloud;
    //}        
          
    const urlValid = pattern.test(url);

    const queueConstruct = {
      textChannel: message.channel,
      channel,
      connection: null,
      songs: [],
      loop: false,
      volume: DEFAULT_VOLUME || 100,
      playing: true
    };

    let playlist = null;
    let videos = [];

    if (urlValid) {
      try {
        playlist = await youtube.getPlaylist(url, { part: "snippet" });
        videos = await playlist.getVideos(MAX_PLAYLIST_SIZE || 10, { part: "snippet" });
      } catch (error) {
        console.error(error);
        return message.reply(i18n.__("playlist.errorNotFoundPlaylist")).catch(console.error);
      }
    } else if (scdl.isValidUrl(url)) {
      if (zfisc.includes("/sets/")) {
        message.channel.send(i18n.__("playlist.fetchingPlaylist"));
        playlist = await scdl.getSetInfo(url, SOUNDCLOUD_CLIENT_ID);
        videos = playlist.tracks.map((track) => ({
          title: track.title,
          url: track.permalink_url,
          duration: track.duration / 1000
        }));
      }
    } else {
      try {
        const results = await youtube.searchPlaylists(search, 1, { part: "snippet" });
        playlist = results[0];
        videos = await playlist.getVideos(MAX_PLAYLIST_SIZE || 10, { part: "snippet" });
      } catch (error) {
        console.error(error);
        return message.reply(error.message).catch(console.error);
      }
    }

    const newSongs = videos
      .filter((video) => video.title != "Private video" && video.title != "Deleted video")
      .map((video) => {
        return (song = {
          title: video.title,
          url: video.url,
          duration: video.durationSeconds
        });
      });

    serverQueue ? serverQueue.songs.push(...newSongs) : queueConstruct.songs.push(...newSongs);

    let playlistEmbed = new MessageEmbed()
      .setTitle(`${playlist.title}`)
      .setDescription(newSongs.map((song, index) => `${index + 1}. ${song.title}`))
      .setURL(playlist.url)
      .setColor("#F8AA2A")
	  .setThumbnail("https://apps.chisdealhd.co.uk/botimgs/pmoLfeY.gif")
      .setTimestamp();

    if (playlistEmbed.description.length >= 2048)
      playlistEmbed.description =
        playlistEmbed.description.substr(0, 2007) + i18n.__("playlist.playlistCharLimit");

    message.channel.send(i18n.__mf("playlist.startedPlaylist", { author: message.author }), playlistEmbed);

    if (!serverQueue) {
      message.client.queue.set(message.guild.id, queueConstruct);

      try {
        queueConstruct.connection = await channel.join();
        await queueConstruct.connection.voice.setSelfDeaf(true);
        play(queueConstruct.songs[0], message);
      } catch (error) {
        console.error(error);
        message.client.queue.delete(message.guild.id);
        await channel.leave();
        return message.channel.send(i18n.__("play.cantJoinChannel", { error: error })).catch(console.error);
      }
    }
        
        
  } 
};
