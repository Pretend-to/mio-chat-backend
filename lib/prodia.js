import api from "api";
const sdk = api("@prodia/v1.3.0#be019b2kls0gqss3");
sdk.auth("46aab1ff-0457-43f1-8e67-f9104e5f9e74");

export async function getImgUrl(config) {
    const { data } = await sdk.transform(config);
    const result = await getJob(data.job);
    return result.imageUrl;
}

export async function getBigImgUrl(config) {
    const { data } = await sdk.upscale(config);
    const  result  = await getJob(data.job);
    return result.imageUrl;
}

async function getJob(id) {
    return new Promise((resolve, reject) => {
        const checkStatus = async () => {
            const { data } = await sdk.getJob({ jobId: id });
            if (data.status === "succeeded") {
                resolve(data);
            } else if (data.status === "failed") {
                reject(new Error("Job status is failed"));
            } else {
                setTimeout(checkStatus, 250);
            }
        };
        checkStatus();
    });
}
