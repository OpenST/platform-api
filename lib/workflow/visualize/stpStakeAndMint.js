const rootPrefix = '../..',
  stpStakeAndMintConfig = require(rootPrefix + '/lib/workflow/stakeAndMint/stPrime/stepsConfig');

function generateDotFile() {
  let inputDotData = [];

  inputDotData.push('"digraph G {"');
  for (let step in stpStakeAndMintConfig) {
    let stepData = stpStakeAndMintConfig[step];
    console.log(stepData);
    let startStep = sentenceCaseText(step),
      endSteps = stepData.onSuccess;

    for (let i = 0; i < endSteps.length; i++) {
      let endStep = sentenceCaseText(endSteps[i]);
      inputDotData.push('"' + startStep + '" -> "' + endStep + '";');
    }
  }
  inputDotData.push('"}"');
  console.log(inputDotData.join('\n'));
}

function sentenceCaseText(camelCaseText) {
  let result = camelCaseText.replace(/([A-Z])/g, ' $1');
  return result.charAt(0).toUpperCase() + result.slice(1);
}

generateDotFile();
