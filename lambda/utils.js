/**
 * generate random index from a collection using the modern version of the
 * [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
 * @param {*} length length of the collection
 * @param {*} n number of indexes to return
 */
const sampleIndexes = function(length, n) {
  const gameQuestions = [];
  const indexList = [];
  let index = length;
  if (n > index) {
    throw new Error("Invalid Game Length.");
  }

  for (let i = 0; i < length; i += 1) {
    indexList.push(i);
  }

  for (let j = 0; j < n; j += 1) {
    const rand = Math.floor(Math.random() * index);
    index -= 1;

    const temp = indexList[index];
    indexList[index] = indexList[rand];
    indexList[rand] = temp;
    gameQuestions.push(indexList[index]);
  }
  return gameQuestions;
};

const populateRoundAnswers = function(
  gameQuestionIndexes,
  currentQuestionIndex,
  correctAnswerTargetLocation,
  source,
  answerCount
) {
  const answers = [];
  const translatedCapitalCountry =
    source[gameQuestionIndexes[currentQuestionIndex]];

  const answer =
    translatedCapitalCountry[Object.keys(translatedCapitalCountry)[0]];

  const randAnsIndex = sampleIndexes(source.length, answerCount);

  for (let j = 0; j < answerCount; j += 1) {
    if (correctAnswerTargetLocation !== j) {
      const keyValue = source[randAnsIndex[j]];
      answers[j] = keyValue[Object.keys(keyValue)[0]];
    } else {
      // insert the correct answer
      answers[j] = answer;
    }
  }

  return answers;
};

module.exports = {
  sampleIndexes,
  populateRoundAnswers
};
