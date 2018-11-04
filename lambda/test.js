const utils = require("./utils");
const questionData = require("./question");

const GAME_LENGTH = 5;

function populateGameQuestionIndexes(translatedQuestions) {
  const gameQuestions = [];
  const indexList = [];
  let index = translatedQuestions.length;
  if (GAME_LENGTH > index) {
    throw new Error("Invalid Game Length.");
  }

  for (let i = 0; i < translatedQuestions.length; i += 1) {
    indexList.push(i);
  }

  for (let j = 0; j < GAME_LENGTH; j += 1) {
    const rand = Math.floor(Math.random() * index);
    index -= 1;

    const temp = indexList[index];
    indexList[index] = indexList[rand];
    indexList[rand] = temp;
    gameQuestions.push(indexList[index]);
  }
  return gameQuestions;
}

let indexes = utils.sampleIndexes(20, 5);
let ans = utils.populateRoundAnswers(
  indexes,
  1,
  3,
  questionData.COUNTRY_CAPITAL_EN_US,
  4
);
console.log(indexes);
console.log(ans);
