import express from "express";
import { createEventAdapter } from "@slack/events-api";
import { createServer } from "http";
import { WebClient } from "@slack/web-api";

if (
  process.env.SLACK_SIGNING_SECRET === undefined ||
  process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN == undefined
) {
  console.log("Cannot find SLACK SIGING SECRET or USER OAUTH ACCESS TOKEN");
  process.exit(1);
}
const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);
const webClient = new WebClient(process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN);

function shuffle(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

slackEvents.on("app_mention", async (event) => {
  let text = event.text;
  console.log(text);
  if (text.startsWith("Reminder:")) {
    text = text.replace("Reminder:", "").trim();
  }
  console.log(text);
  const botId: string = text.split(" ")[0];
  console.log("id: " + botId);
  const strJson: string = text.replace(botId, "").trim();
  console.log("json string: " + strJson);
  try {
    const query: any = JSON.parse(strJson);

    if (query.names === undefined) {
      throw 'The parameter "names" is not defined';
    }
    const strNames = query.names as string;

    const teamSize: number = query.size
      ? (query.size as string)
        ? parseInt(query.size)
        : query.size
      : 4;

    const message: string = query.message as string | "Random Team Generator: ";

    const arrNames: string[] = strNames.replace(/\s/g, "").split(",");
    shuffle(arrNames);

    const nTeams: number = Math.ceil(arrNames.length / teamSize);
    const teams: string[][] = new Array(nTeams);
    for (let i = 0; i < nTeams; i++) {
      teams[i] = new Array();
      for (let j = 0; j < teamSize; j++) {
        teams[i].push(arrNames[i * teamSize + j]);
      }
    }

    let strTeamBuilding: string = "" + message + `\n`;
    const baseTeam: number = "A".charCodeAt(0);
    teams.forEach((team: string[], index: number) => {
      strTeamBuilding += String.fromCharCode(baseTeam + index) + " ??? - ";
      team.forEach((name: string) => {
        if (name as string) {
          strTeamBuilding += "`" + name + "` ";
        }
      });
      strTeamBuilding += `\n`;
    });

    webClient.chat.postMessage({
      text: String(strTeamBuilding),
      channel: event.channel,
    });
  } catch (err) {
    console.log(err);
    webClient.chat.postMessage({
      text: String(
        'Usage: {"names": "park, choi, kim, lee", "size":2 <optional, default: 4>, "message": "Lunch Teams" <optional>}'
      ),
      channel: event.channel,
    });
  }
});

const app = express();

app.use("/slack/events", slackEvents.requestListener());

const port = process.env.PORT || 8000;
createServer(app).listen(port, () => {
  console.log(`???? Server ready at ${port}`);
});
