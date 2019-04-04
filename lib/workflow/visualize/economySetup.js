const rootPrefix = '../../..',
  economySetupConfig = require(rootPrefix + '/lib/workflow/economySetup/stepsConfig');

function generateDotFile() {
  let inputDotData = [];

  inputDotData.push('digraph G {');
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
  inputDotData.push('}');
  console.log(inputDotData.join('\n'));
}

function sentenceCaseText(camelCaseText) {
  let result = camelCaseText.replace(/([A-Z])/g, ' $1');
  return result.charAt(0).toUpperCase() + result.slice(1);
}

generateDotFile();

// Command to generate svg file Example:
// diagrams dot economy_setup.dot economy_setup.svg
//
// Below is the example of economy_setup.dot
//
// digraph G {
//   main -> parse -> execute;
//   main -> init;
//   main -> cleanup;
//   execute -> make_string;
//   execute -> printf
//   init -> make_string;
//   main -> printf;
//   execute -> compare;
// }
