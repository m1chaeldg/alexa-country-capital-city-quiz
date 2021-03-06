/* eslint-disable  func-names */
/* eslint-disable  no-console */

const utils = require("./utils");
const Alexa = require("ask-sdk-core");
const data = require("./country-capital-data");
const i18n = require("i18next");
const sprintf = require("i18next-sprintf-postprocessor");

const ANSWER_COUNT = 4;
const GAME_LENGTH = 10;

function isAnswerSlotValid(intent) {
  const answerSlotFilled =
    intent && intent.slots && intent.slots.Answer && intent.slots.Answer.value;
  const answerSlotIsInt =
    answerSlotFilled && !Number.isNaN(parseInt(intent.slots.Answer.value, 10));
  return (
    answerSlotIsInt &&
    parseInt(intent.slots.Answer.value, 10) < ANSWER_COUNT + 1 &&
    parseInt(intent.slots.Answer.value, 10) > 0
  );
}

function handleUserGuess(userGaveUp, handlerInput) {
  const { requestEnvelope, attributesManager, responseBuilder } = handlerInput;
  const { intent } = requestEnvelope.request;

  const answerSlotValid = isAnswerSlotValid(intent);

  let speechOutput = "";
  let speechOutputAnalysis = "";

  const sessionAttributes = attributesManager.getSessionAttributes();
  const gameQuestions = sessionAttributes.questions;
  let correctAnswerIndex = parseInt(sessionAttributes.correctAnswerIndex, 10);
  let currentScore = parseInt(sessionAttributes.score, 10);
  let currentQuestionIndex = parseInt(
    sessionAttributes.currentQuestionIndex,
    10
  );
  const { correctAnswerText } = sessionAttributes;
  const requestAttributes = attributesManager.getRequestAttributes();
  const translatedCountriesAndCapital = requestAttributes.t("COUNTRY_CAPITALS");

  if (
    answerSlotValid &&
    parseInt(intent.slots.Answer.value, 10) ===
      sessionAttributes.correctAnswerIndex
  ) {
    currentScore += 1;
    speechOutputAnalysis = requestAttributes.t("ANSWER_CORRECT_MESSAGE");
  } else {
    if (!userGaveUp) {
      speechOutputAnalysis = requestAttributes.t("ANSWER_WRONG_MESSAGE");
    }

    speechOutputAnalysis += requestAttributes.t(
      "CORRECT_ANSWER_MESSAGE",
      correctAnswerIndex,
      correctAnswerText
    );
  }

  // Check if we can exit the game session after GAME_LENGTH questions (zero-indexed)
  if (sessionAttributes.currentQuestionIndex === GAME_LENGTH - 1) {
    speechOutput = userGaveUp ? "" : requestAttributes.t("ANSWER_IS_MESSAGE");
    speechOutput +=
      speechOutputAnalysis +
      requestAttributes.t(
        "GAME_OVER_MESSAGE",
        currentScore.toString(),
        GAME_LENGTH.toString()
      );

    return responseBuilder.speak(speechOutput).getResponse();
  }
  currentQuestionIndex += 1;
  correctAnswerIndex = Math.floor(Math.random() * ANSWER_COUNT);

  const { country, capital } = utils.getCountryAndCapital(
    translatedCountriesAndCapital,
    gameQuestions[currentQuestionIndex]
  );

  const spokenQuestion = requestAttributes.t("QUESTION_PREFIX", country);

  const roundAnswers = utils.populateRoundAnswers(
    gameQuestions,
    currentQuestionIndex,
    correctAnswerIndex,
    translatedCountriesAndCapital,
    ANSWER_COUNT
  );
  const questionIndexForSpeech = currentQuestionIndex + 1;
  let repromptText = requestAttributes.t(
    "TELL_QUESTION_MESSAGE",
    questionIndexForSpeech.toString(),
    spokenQuestion
  );

  for (let i = 0; i < ANSWER_COUNT; i += 1) {
    repromptText += `${i + 1}. ${roundAnswers[i]}. `;
  }

  speechOutput += userGaveUp ? "" : requestAttributes.t("ANSWER_IS_MESSAGE");
  speechOutput +=
    speechOutputAnalysis +
    requestAttributes.t("SCORE_IS_MESSAGE", currentScore.toString()) +
    repromptText;

  Object.assign(sessionAttributes, {
    speechOutput: repromptText,
    repromptText,
    currentQuestionIndex,
    correctAnswerIndex: correctAnswerIndex + 1,
    questions: gameQuestions,
    score: currentScore,
    correctAnswerText: capital
  });

  return responseBuilder
    .speak(speechOutput)
    .reprompt(repromptText)
    .withSimpleCard(requestAttributes.t("GAME_NAME"), repromptText)
    .getResponse();
}

function startGame(newGame, handlerInput) {
  const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
  let speechOutput = newGame
    ? requestAttributes.t(
        "NEW_GAME_MESSAGE",
        requestAttributes.t("GAME_NAME")
      ) + requestAttributes.t("WELCOME_MESSAGE", GAME_LENGTH.toString())
    : "";

  const translatedCapitalCountry = requestAttributes.t("COUNTRY_CAPITALS");

  const gameQuestionIndexes = utils.sampleIndexes(
    translatedCapitalCountry.length,
    GAME_LENGTH
  );
  const correctAnswerIndex = Math.floor(Math.random() * ANSWER_COUNT);

  const roundAnswers = utils.populateRoundAnswers(
    gameQuestionIndexes,
    0,
    correctAnswerIndex,
    translatedCapitalCountry,
    ANSWER_COUNT
  );
  const currentQuestionIndex = 0;
  const { country, capital } = utils.getCountryAndCapital(
    translatedCapitalCountry,
    gameQuestionIndexes[currentQuestionIndex]
  );

  const spokenQuestion = requestAttributes.t("QUESTION_PREFIX", country);
  let repromptText = requestAttributes.t(
    "TELL_QUESTION_MESSAGE",
    "1",
    spokenQuestion
  );
  for (let i = 0; i < ANSWER_COUNT; i += 1) {
    repromptText += `${i + 1}. ${roundAnswers[i]}. `;
  }

  speechOutput += repromptText;
  const sessionAttributes = {};

  Object.assign(sessionAttributes, {
    speechOutput: repromptText,
    repromptText,
    currentQuestionIndex,
    correctAnswerIndex: correctAnswerIndex + 1,
    questions: gameQuestionIndexes,
    score: 0,
    correctAnswerText: capital
  });

  handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

  return handlerInput.responseBuilder
    .speak(speechOutput)
    .reprompt(repromptText)
    .withSimpleCard(requestAttributes.t("GAME_NAME"), repromptText)
    .getResponse();
}

function helpTheUser(newGame, handlerInput) {
  const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
  const askMessage = newGame
    ? requestAttributes.t("ASK_MESSAGE_START")
    : requestAttributes.t("REPEAT_QUESTION_MESSAGE") +
      requestAttributes.t("STOP_MESSAGE");
  const speechOutput =
    requestAttributes.t("HELP_MESSAGE", GAME_LENGTH) + askMessage;
  const repromptText = requestAttributes.t("HELP_REPROMPT") + askMessage;

  return handlerInput.responseBuilder
    .speak(speechOutput)
    .reprompt(repromptText)
    .getResponse();
}

/* jshint -W101 */
const languageString = {
  en: {
    translation: {
      COUNTRY_CAPITALS: data.COUNTRY_CAPITAL_EN_US,
      GAME_NAME: "Capital Country Trivia",
      QUESTION_PREFIX: "What is the capital city of %s?",
      HELP_MESSAGE:
        "I will ask you %s multiple choice questions. Respond with the number of the answer. For example, say one, two, three, or four. To start a new game at any time, say, start game. ",
      REPEAT_QUESTION_MESSAGE: "To repeat the last question, say, repeat. ",
      ASK_MESSAGE_START: "Would you like to start playing?",
      HELP_REPROMPT:
        "To give an answer to a question, respond with the number of the answer. ",
      STOP_MESSAGE: "Would you like to keep playing?",
      CANCEL_MESSAGE: "Ok, let's play again soon.",
      NO_MESSAGE: "Ok, we'll play another time. Goodbye!",
      TRIVIA_UNHANDLED: "Try saying a number between 1 and %s",
      HELP_UNHANDLED: "Say yes to continue, or no to end the game.",
      START_UNHANDLED: "Say start to start a new game.",
      NEW_GAME_MESSAGE: "Welcome to %s. ",
      WELCOME_MESSAGE:
        "I will ask you %s questions, try to get as many right as you can. Just say the number of the answer. Let's begin. ",
      ANSWER_CORRECT_MESSAGE: "correct. ",
      ANSWER_WRONG_MESSAGE: "wrong. ",
      CORRECT_ANSWER_MESSAGE: "The correct answer is %s: %s. ",
      ANSWER_IS_MESSAGE: "That answer is ",
      TELL_QUESTION_MESSAGE: "Question %s. %s ",
      GAME_OVER_MESSAGE:
        "You got %s out of %s questions correct. Thank you for playing!",
      SCORE_IS_MESSAGE: "Your score is %s. "
    }
  },
  "en-US": {
    translation: {
      COUNTRY_CAPITALS: data.COUNTRY_CAPITAL_EN_US
    }
  },
  "en-GB": {
    translation: {
      COUNTRY_CAPITALS: data.COUNTRY_CAPITAL_EN_US
    }
  },
  // TODO : for DE
  de: {
    translation: {
      COUNTRY_CAPITALS: data.COUNTRY_CAPITAL_DE_DE,
      GAME_NAME: "Hauptstadt des Landes Wissenswertes",
      QUESTION_PREFIX: "Was ist die Hauptstadt von %s?",
      HELP_MESSAGE:
        "Ich stelle dir %s Multiple-Choice-Fragen. Antworte mit der Zahl, die zur richtigen Antwort gehört. Sage beispielsweise eins, zwei, drei oder vier. Du kannst jederzeit ein neues Spiel beginnen, sage einfach „Spiel starten“. ",
      REPEAT_QUESTION_MESSAGE:
        "Wenn die letzte Frage wiederholt werden soll, sage „Wiederholen“ ",
      ASK_MESSAGE_START: "Möchten Sie beginnen?",
      HELP_REPROMPT:
        "Wenn du eine Frage beantworten willst, antworte mit der Zahl, die zur richtigen Antwort gehört. ",
      STOP_MESSAGE: "Möchtest du weiterspielen?",
      CANCEL_MESSAGE: "OK, dann lass uns bald mal wieder spielen.",
      NO_MESSAGE: "OK, spielen wir ein andermal. Auf Wiedersehen!",
      TRIVIA_UNHANDLED: "Sagt eine Zahl beispielsweise zwischen 1 und %s",
      HELP_UNHANDLED:
        "Sage ja, um fortzufahren, oder nein, um das Spiel zu beenden.",
      START_UNHANDLED:
        "Du kannst jederzeit ein neues Spiel beginnen, sage einfach „Spiel starten“.",
      NEW_GAME_MESSAGE: "Willkommen bei %s. ",
      WELCOME_MESSAGE:
        "Ich stelle dir %s Fragen und du versuchst, so viele wie möglich richtig zu beantworten. Sage einfach die Zahl, die zur richtigen Antwort passt. Fangen wir an. ",
      ANSWER_CORRECT_MESSAGE: "Richtig. ",
      ANSWER_WRONG_MESSAGE: "Falsch. ",
      CORRECT_ANSWER_MESSAGE: "Die richtige Antwort ist %s: %s. ",
      ANSWER_IS_MESSAGE: "Diese Antwort ist ",
      TELL_QUESTION_MESSAGE: "Frage %s. %s ",
      GAME_OVER_MESSAGE:
        "Du hast %s von %s richtig beantwortet. Danke fürs Mitspielen!",
      SCORE_IS_MESSAGE: "Dein Ergebnis ist %s. "
    }
  }
};

const LocalizationInterceptor = {
  process(handlerInput) {
    const localizationClient = i18n.use(sprintf).init({
      lng: handlerInput.requestEnvelope.request.locale,
      overloadTranslationOptionHandler:
        sprintf.overloadTranslationOptionHandler,
      resources: languageString,
      returnObjects: true
    });

    const attributes = handlerInput.attributesManager.getRequestAttributes();
    attributes.t = function(...args) {
      return localizationClient.t(...args);
    };
  }
};

const LaunchRequest = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return (
      request.type === "LaunchRequest" ||
      (request.type === "IntentRequest" &&
        request.intent.name === "AMAZON.StartOverIntent")
    );
  },
  handle(handlerInput) {
    return startGame(true, handlerInput);
  }
};

const HelpIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return (
      request.type === "IntentRequest" &&
      request.intent.name === "AMAZON.HelpIntent"
    );
  },
  handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    const newGame = !sessionAttributes.questions;
    return helpTheUser(newGame, handlerInput);
  }
};

const UnhandledIntent = {
  canHandle() {
    return true;
  },
  handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    if (Object.keys(sessionAttributes).length === 0) {
      const speechOutput = requestAttributes.t("START_UNHANDLED");
      return handlerInput.attributesManager
        .speak(speechOutput)
        .reprompt(speechOutput)
        .getResponse();
    } else if (sessionAttributes.questions) {
      const speechOutput = requestAttributes.t(
        "TRIVIA_UNHANDLED",
        ANSWER_COUNT.toString()
      );
      return handlerInput.attributesManager
        .speak(speechOutput)
        .reprompt(speechOutput)
        .getResponse();
    }
    const speechOutput = requestAttributes.t("HELP_UNHANDLED");
    return handlerInput.attributesManager
      .speak(speechOutput)
      .reprompt(speechOutput)
      .getResponse();
  }
};

const SessionEndedRequest = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "SessionEndedRequest";
  },
  handle(handlerInput) {
    console.log(
      `Session ended with reason: ${
        handlerInput.requestEnvelope.request.reason
      }`
    );

    return handlerInput.responseBuilder.getResponse();
  }
};

const AnswerIntent = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      (handlerInput.requestEnvelope.request.intent.name === "AnswerIntent" ||
        handlerInput.requestEnvelope.request.intent.name === "DontKnowIntent")
    );
  },
  handle(handlerInput) {
    if (handlerInput.requestEnvelope.request.intent.name === "AnswerIntent") {
      return handleUserGuess(false, handlerInput);
    }
    return handleUserGuess(true, handlerInput);
  }
};

const RepeatIntent = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "AMAZON.RepeatIntent"
    );
  },
  handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    return handlerInput.responseBuilder
      .speak(sessionAttributes.speechOutput)
      .reprompt(sessionAttributes.repromptText)
      .getResponse();
  }
};

const YesIntent = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "AMAZON.YesIntent"
    );
  },
  handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    if (sessionAttributes.questions) {
      return handlerInput.responseBuilder
        .speak(sessionAttributes.speechOutput)
        .reprompt(sessionAttributes.repromptText)
        .getResponse();
    }
    return startGame(false, handlerInput);
  }
};

const StopIntent = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "AMAZON.StopIntent"
    );
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const speechOutput = requestAttributes.t("STOP_MESSAGE");

    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt(speechOutput)
      .getResponse();
  }
};

const CancelIntent = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "AMAZON.CancelIntent"
    );
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const speechOutput = requestAttributes.t("CANCEL_MESSAGE");

    return handlerInput.responseBuilder.speak(speechOutput).getResponse();
  }
};

const NoIntent = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "AMAZON.NoIntent"
    );
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const speechOutput = requestAttributes.t("NO_MESSAGE");
    return handlerInput.responseBuilder.speak(speechOutput).getResponse();
  }
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak("Sorry, I can't understand the command. Please say again.")
      .reprompt("Sorry, I can't understand the command. Please say again.")
      .getResponse();
  }
};

const skillBuilder = Alexa.SkillBuilders.custom();
exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequest,
    HelpIntent,
    AnswerIntent,
    RepeatIntent,
    YesIntent,
    StopIntent,
    CancelIntent,
    NoIntent,
    SessionEndedRequest,
    UnhandledIntent
  )
  .addRequestInterceptors(LocalizationInterceptor)
  .addErrorHandlers(ErrorHandler)
  .lambda();
