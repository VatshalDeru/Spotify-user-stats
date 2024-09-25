import express from 'express'
import axios from 'axios'
import bodyParser  from 'body-parser'
import SpotifyWebApi from 'spotify-web-api-node'
import dotenv from 'dotenv';

dotenv.config()
const app = express()
const PORT = 3000
const scopes = ['user-read-private', 'user-read-email', 'playlist-read-private', 'user-top-read'];


const spotifyApi = new SpotifyWebApi({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URL
})


app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: true }));

//login method
app.get('/login',(req, res) =>{
    // const state = generateRandomString(16);
    const scope = scopes;

    res.redirect(spotifyApi.createAuthorizeURL(scope))
})

app.get('/callback', (req, res) =>{
    const error = req.query.error
    const code = req.query.code
    const state = req.query.state

    if(error){
        console.error('Error', error)
        res.send(`Error: ${error}`)
        return
    }
    
    spotifyApi.authorizationCodeGrant(code).then(
        (data) => {
            // console.log('The token expires in ' + data.body['expires_in']);
            // console.log('The access token is ' + data.body['access_token']);
            // console.log('The refresh token is ' + data.body['refresh_token']);

            const accessToken = data.body['access_token']
            const refreshToken = data.body['refresh_token']
            const expiresIn = data.body['expires_in']

            // Set the access token on the API object to use it in later calls

            spotifyApi.setAccessToken(data.body['access_token']);
            spotifyApi.setRefreshToken(data.body['refresh_token']);

            console.log(accessToken + '----' +refreshToken)
            // res.send('Success!')
            // res.redirect('/')

            console.log('You have been logged in')

            res.redirect('/');

            app.post('/submit', async (req, res) => {
                const { userId } = req.body;
                try {
                    //playlist data
                    const playlistData = await spotifyApi.getUserPlaylists();
                    const playlists = playlistData.body.items;

                    //user data
                    const userData = await spotifyApi.getUser(userId)
                    const userInfo = userData.body;
                    
                    //top user artist
                    const userArtistsData = await spotifyApi.getMyTopArtists()
                    const userArtists =userArtistsData.body.items
                    const userArtistsPic = []
                    for( let artist of userArtists){
                        let pic = artist.images
                        userArtistsPic.push(pic)
                    }
                    // log the obtained data
                    console.log('User playlists:', playlists);
                    console.log('User display name:', userInfo);
                    console.log('User favourite artists:', userArtists);
                    console.log('User favourite artists pic:', userArtistsPic);

                    // payload array to contain the info fetched above to be sent to resul.ejs
                    const payload = []
                    payload.push(playlists, userInfo, userArtists, userArtistsPic)

                    res.render('result.ejs', {data: payload})
                    // res.redirect('/');
                } catch (error) {
                    console.error('Error:', error);
                    res.send('Error fetching user playlists');
                }
            });

            // console.log('available ' + playlist)
            setInterval(async()=>{
                const data = await spotifyApi.refreshAccessToken()
                    .then( data =>{
                        console.log('The acces token has been refreshed')

                        spotifyApi.setAccessToken(data.body['access_token'])
                    }, err =>{
                        console.log('Could not refesh the token' + err)
                    })
            }, expiresIn/2*1000)

        },
        function(err) {
          console.log('Something went wrong!', err);
        }
    ).catch(error =>{
        console.log('Error', error)
        res.send('Error getting token')
    });
    
})


app.get('/search', (req, res) =>{
    const {q} = req.query
    spotifyApi.searchTracks(q).then(
        function(searchData) {
          console.log(searchData.body);
          const trackUri = searchData.body.tracks.items[0].uri
          res.send({uri: trackUri})
        },
        function(err) {
          console.log('Something went wrong!', err);
        }
      );
})

app.get('/', (req, res) =>{
    res.render('index.ejs')

})

app.listen(PORT, ()=> console.log(`running on port:${PORT}`))

