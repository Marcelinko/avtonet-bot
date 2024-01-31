const { Client, Events, GatewayIntentBits, EmbedBuilder} = require('discord.js');
require('dotenv').config()
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

const isAvtonetUrl = (url) => {
    return !!url.includes('https://www.avto.net/Ads');
}
const getFirstAvtonetUrl = (message) => {
    const messageArray = message.split(' ');
    return messageArray.find((word) => isAvtonetUrl(word));
}

const openPage = async (url) => {
    const browser = await puppeteer.launch({headless: 'new'});
    const page = await browser.newPage();
    await page.goto(url);
    return {browser, page};
}

const xPathTitle = (divNumber) => {
    return `/html/body/strong/div[1]/div/div/div[2]/div/div[1]/div[3]/div[1]/div[${divNumber}]/div/div/span`
}
const xPathValue = (divNumber) => {
    return `/html/body/strong/div[1]/div/div/div[2]/div/div[1]/div[3]/div[1]/div[${divNumber}]/div/div/h5`
}
const xPathPrice = () => {
    return '/html/body/strong/div[1]/div/div/div[2]/div';
}

client.on(Events.MessageCreate, async (message) => {
    let getImageUrl;
    if (message.channelId === process.env.AVTONET_CHANNEL_ID) {
        if (isAvtonetUrl(message.content)) {

            const carUrl = getFirstAvtonetUrl(message.content);
            if (!carUrl) return;
            const {page, browser} = await openPage(carUrl);
            try {
                const evaluateAndTrim = async (element) => {
                    try {
                        return await page.evaluate(el => el.textContent.trim(), element[0])
                    } catch (e) {
                        return '';
                    }
                };

                getImageUrl = async () => {
                    try {
                        return await page.$eval("head > meta[property='og:image']", el => el.content);
                    } catch (e) {
                        return '';
                    }
                }

                const [
                    div5Title,
                    div6Title,

                    firstRegistrationValue,
                    kilometersValue,
                    ownersValue,
                    fuelTypeValue,
                    div5Value,
                    div6Value,

                    priceValueOriginal,
                    priceValueDDV,
                    priceValueDiscount,
                    priceValueCall,
                    priceValueFinancing
                ] = await Promise.all([
                    page.$x(xPathTitle(5)),
                    page.$x(xPathTitle(6)),

                    page.$x(xPathValue(1)),
                    page.$x(xPathValue(2)),
                    page.$x(xPathValue(3)),
                    page.$x(xPathValue(4)),
                    page.$x(xPathValue(5)),
                    page.$x(xPathValue(6)),

                    page.$x(xPathPrice() + '/div[1]/div[2]/div[1]/div/p'),
                    page.$x(xPathPrice() + '/div[2]/div[1]/div/div[1]/p[1]'),
                    page.$x(xPathPrice() + '/div[1]/div[2]/div/div[2]/p[2]/span'),
                    page.$x(xPathPrice() + '/div[1]/div[2]/div/div/p'),
                    page.$x(xPathPrice() + '/div[1]/div[2]/div/div[1]/p')
                ]);

                const titleText = await page.title();
                const imageUrl = await getImageUrl();
                const [
                    div5TitleText,
                    div6TitleText,

                    firstRegistrationText,
                    kilometersText,
                    ownersText,
                    fuelTypeText,
                    div5Text,
                    div6Text,

                    priceTextOriginal,
                    priceTextDDV,
                    priceTextDiscount,
                    priceTextCall,
                    priceTextFinancing
                ] = await Promise.all([
                    evaluateAndTrim(div5Title),
                    evaluateAndTrim(div6Title),

                    evaluateAndTrim(firstRegistrationValue),
                    evaluateAndTrim(kilometersValue),
                    evaluateAndTrim(ownersValue),
                    evaluateAndTrim(fuelTypeValue),
                    evaluateAndTrim(div5Value),
                    evaluateAndTrim(div6Value),

                    evaluateAndTrim(priceValueOriginal),
                    evaluateAndTrim(priceValueDDV),
                    evaluateAndTrim(priceValueDiscount),
                    evaluateAndTrim(priceValueCall),
                    evaluateAndTrim(priceValueFinancing),
                ]);

                const priceText = priceTextOriginal || priceTextDDV || priceTextDiscount || priceTextCall || priceTextFinancing;

                const embed = new EmbedBuilder()
                    .setColor(0x89B2EB)
                    .setTitle(titleText).setURL(carUrl)
                    .setAuthor({
                        name: message.author.globalName,
                        iconURL: `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png`
                    }).setDescription(priceText ? `<:price:1201893072481570906>  ${priceText}` : '\u200B')

                if (firstRegistrationText) {
                    embed.addFields({
                        name: '<:date_custom:1201881912185196584> Prva registracija',
                        value: firstRegistrationText,
                        inline: true
                    })
                }
                if (kilometersText) {
                    embed.addFields({
                        name: '<:kilometers:1201881789124325447> Prevoženi kilometri',
                        value: kilometersText,
                        inline: true
                    })
                }
                if (ownersText) {
                    embed.addFields({
                        name: '<:owners:1201881866244980766> Število lastnikov',
                        value: ownersText,
                        inline: true
                    })
                }
                if (fuelTypeText) {
                    embed.addFields({
                        name: `${fuelTypeText === 'elektrika' ? '<:electricity:1201983587839119431>' : '<:pump:1201878098191319131>'} Gorivo`,
                        value: fuelTypeText,
                        inline: true
                    })
                }
                if (div5Text) {
                    embed.addFields({
                        name: div5TitleText === 'Moč motorja' ?'<:engine:1201882069966536734> Motor':'<:battery_custom:1201903500817072148> Kapaciteta baterije',
                        value: div5TitleText === 'Moč motorja' ? div5Text.replaceAll(/\s/g,''): div5Text,
                        inline: true
                    })
                }
                if (div6Text) {
                    embed.addFields({
                        name: div6TitleText === 'Menjalnik' ? '<:gearbox:1201882114643992617> Menjalnik': '<:electric_engine:1201903976778305597> Električna moč',
                        value: div6Text,
                        inline: true
                    })
                }
                await message.delete();
                await message.channel.send({
                    embeds: [embed],
                    files: [{attachment: imageUrl, name: `${titleText}.jpg`}]
                });
            } catch (e) {
                console.error(e);
            } finally {
                await browser.close();
            }
        }
    }
});

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN).then(() => console.log('Logged in'));