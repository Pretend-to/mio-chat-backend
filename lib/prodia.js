import api from "api";
const sdk = api("@prodia/v1.3.0#be019b2kls0gqss3");

export async function getImgUrl(config) {
    sdk.auth("46aab1ff-0457-43f1-8e67-f9104e5f9e74");
    const { data } = await sdk.transform(config);
    const { result } = await getJob(data.job);
    return result.imageUrl;
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