const rootPrefix = '../..',
  economySetupConfig = require(rootPrefix + '/lib/workflow/economySetup/stepsConfig');

function generateDotFile() {
  let inputDotData = [];

  for (let step in economySetupConfig) {
    let stepData = economySetupConfig[step];
    console.log(stepData);
    let startStep = sentenceCaseText(step),
      endSteps = stepData.onSuccess;

    for (let i = 0; i < endSteps.length; i++) {
      let endStep = sentenceCaseText(endSteps[i]);
      inputDotData.push('"' + startStep + '" -> "' + endStep + '";');
    }
  }
  console.log(inputDotData.join('\n'));
}

function sentenceCaseText(camelCaseText) {
  let result = camelCaseText.replace(/([A-Z])/g, ' $1');
  return result.charAt(0).toUpperCase() + result.slice(1);
}

generateDotFile();
