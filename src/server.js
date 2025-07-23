import app from './app.js'

const port = app.get('port');

const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
});

export default server;