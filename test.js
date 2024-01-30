import { bing } from 'gpti';

bing({
    messages: [
        {
            role: 'assistant',
            content: 'Hello! How can I help you today? 😊'
        },
        {
            role: 'user',
            content: 'Hi, tell me the names of the movies released in 2023.'
        }
    ],
    // eslint-disable-next-line camelcase
    conversation_style: 'Balanced',
    markdown: false,
    stream: false,
}, (err, data) => {
    if (err != null) {
        console.log(err);
    } else {
        console.log(data);
    }
});