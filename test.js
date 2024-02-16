/* eslint-disable no-undef */
// import Drawer from "./lib/draw.js";
import api from "api";
const sdk = api("@prodia/v1.3.0#be019b2kls0gqss3");


// const painter = new Drawer();
// const painter = new Drawer();
// const engine = "pixart.a"
// const model = "Fantasy art"
// //const prompt = "An urban landscape bathed in the sunset, where the warm tones of the sun reflect on modern buildings and the orange and purple sky. In the foreground, there's a group of friends gathered on a rooftop, laughing and enjoying the moment. Their expressions radiate joy and camaraderie as they embrace and point towards something on the horizon. The scene is enveloped in a nostalgic and emotional aura that conveys the beauty of friendship and the warmth of the sunset in a futuristic city with touches of anime style."
// const prompt = "Imagine an AI-generated scene depicting a queen standing atop a castle rampart, her golden hair elegantly swept up in a regal updo. The queen gazes into the distance with a mix of determination and contemplation, her eyes reflecting a blend of wisdom and strength. The backdrop showcases a panoramic view of a vast kingdom, with rolling hills and distant horizons stretching out before her. Capture the queen's commanding presence against the backdrop of the majestic castle walls, symbolizing her authority and leadership. Let the artwork convey a sense of power, grace, and a hint of mystery as the queen surveys her realm with a watchful eye."

// const info = painter.getEngineInfo(engine)

// const models = info.models

// const configs = models.map((model) => {
//     return {
//         model: model,
//         width: 512,
//         height: 512
//     }
// });

// const requests = configs.map(config => painter.draw(engine, prompt, config))

// Promise.all(requests)
//     .then(responses => Promise.all(responses.map(res => res)))
//     .then(data => {
//         console.log(data.length);
//     })
//     .catch(error => {
//         console.error("Error fetching data:", error);
//     });

// await painter.draw(engine, prompt, {
//     model: model,
// })

async function main() {
    sdk.auth("46aab1ff-0457-43f1-8e67-f9104e5f9e74");
    sdk.transform({
        imageUrl: "https://api.krumio.com/qava?qq=1099834705",
        model: "revAnimated_v122.safetensors [3f4fefd9]",
        prompt: "4k,high_quality"
    })
        .then(async ({ data }) => {
            console.log(data);
            const result = await getJob(data.job);
            console.log(result);
            
        })
        .catch(err => console.error(err));
}

async function getJob(id) {
    sdk.auth("46aab1ff-0457-43f1-8e67-f9104e5f9e74");
    return new Promise((resolve) => {
        const checkStatus = async () => {
            const { data } = await sdk.getJob({ jobId: id });
            console.log(data);
            if (data.status === "succeeded") {
                resolve(data);
            } else {
                setTimeout(checkStatus, 250);
            }
        };
        checkStatus();
    });
}

// await getJob("ca3bf262-0236-4c8c-8a1e-90e77188dda3");
await main();