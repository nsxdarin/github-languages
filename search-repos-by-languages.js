#!/usr/bin/env node

const request = require('superagent');
const _ = require('lodash');
const bluebird = require('bluebird');
const { chunks } = require('chunk-array');
const jsonToMarkdown = require('json-to-markdown');
const commander = require('commander');
const packageInfo = require('./package');

const token = process.env.GITHUB_TOKEN;

const languages = [
  'JavaScript',
  'Java',
  'HTML',
  'Python',
  'PHP',
  'CSS',
  'Ruby',
  'C#',
  'C++',
  'C',
  'Shell',
  'TypeScript',
  'Jupyter Notebook',
  'Objective-C',
  'Swift',
  'Go',
  'R',
  'MATLAB',
  'Scala',
  'Perl',
  'Rust',
  'Clojure',
  'Kotlin',
  'Vim script',
  'Vue',
];

const reposPerLanguageNumber = 5;

commander
  .version(packageInfo.version)
  .option('-l, --language [type]', 'Language')
  .parse(process.argv);

const retrieve = language => request('https://api.github.com/search/repositories')
  .query({
    q: `stars:>=1000 language:${JSON.stringify(language)}`,
    sort: 'stars',
  })
  .set('Authorization', `token ${token}`)
  .then(
    ({ body }) => body
      .items
      .slice(0, reposPerLanguageNumber)
      .map(item => _.pick(
        item,
        'html_url',
        'stargazers_count',
        'full_name',
        'description',
      )),
  );

const retrieveGroup = async (group) => {
  try {
    return _.zipObject(
      group,
      await Promise.all(group.map(language => retrieve(language))),
    );
  } catch (error) {
    console.error(error);
    await bluebird.delay(20000);
    return retrieveGroup(group);
  }
};

const findRepos = async () => {
  const groups = chunks(languages, 5);
  const results = [];
  for (const [i, group] of Object.entries(groups)) {
    const result = await retrieveGroup(group);
    console.log(JSON.stringify(result));
    results.push(result);
    console.warn(`${i} / ${groups.length} groups processed`);
  }
  const unifiedResults = Object.assign(...results);
  console.log(JSON.stringify(unifiedResults));
  const hashKeys = _.times(reposPerLanguageNumber, i => `#${i + 1}`);
  console.log(jsonToMarkdown(
    Object.entries(unifiedResults)
      .map(([k, v]) => ({
        language: k,
        ..._.zipObject(
          hashKeys,
          v.map(item => `[${item.full_name}](${item.html_url}) (${item.stargazers_count}) ${item.description}`),
        ),
      })),
    ['language', ...hashKeys],
  ));
};

findRepos();