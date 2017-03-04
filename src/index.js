'use strict';
const debounce = require('p-debounce')
const popura = require('popura')
const parseEntities = require('parse-entities')
const mal = popura('lubiencerebro', 'not-so-random-string')
const {memoize} = require('cerebro-tools')
const {compareTwoStrings} = require('string-similarity')
const icon = require('../icon.png')
const keyword = 'mal'
const TAB_KEY = 9
const memoizationSettings = {
  maxAge: 60 * 1000 // 1 minute
}

const map = f => xs => xs.map(f)

const filter = f => xs => xs.filter(f)

const sort = f => xs => xs.sort(f)

const truthy = x => !!x

const search = debounce(memoize((type, query) =>
  type === 'anime'
    ? mal.searchAnimes(query)
    : mal.searchMangas(query)
, memoizationSettings), 300)

const generateUrl = (type, id) =>
  `https://myanimelist.net/${type}/${id}`

const resourceToResult = (type, actions) => ({id, title, synopsis, score, image}) => {
  const url = generateUrl(type, id)

  return {
    icon: image,
    id: `mal-${type}-${id}`,
    title: `${title} [${score}]`,
    subtitle: parseEntities(synopsis),
    clipboard: url,
    onSelect() {
      actions.open(url)
    },
    onKeyDown(event) {
      if (event.keyCode === TAB_KEY) {
        actions.replaceTerm(url)
      }
    }
  }
}

const sortBestMatch = title => (a, b) => {
  const [matchA, matchB] = [
    compareTwoStrings(title, a.title),
    compareTwoStrings(title, b.title)
  ]

  return matchB - matchA
}

const plugin = ({term, display, hide, actions}) => {
  const rgx = /^mal\s*(anime|manga)?\s*(.*)/

  if (!rgx.test(term)) return

  const [, type = null, query] = rgx.exec(term)

  if (!type) {
    const results = ['anime', 'manga']
      .map(type => ({
        icon,
        title: `Search ${type}s`,
        subtitle: `Press Enter to replace input to 'mal ${type}'`,
        onSelect(event) {
          event.preventDefault()
          actions.replaceTerm(`mal ${type} `)
        }
      }))

    return display(results)
  }

  display({
    id: 'mal-loading',
    icon,
    title: `Loading ${type}s for '${query}'`,
    subtitle: 'Wait a minute'
  })

  search(type, query)
    .then(sort(sortBestMatch(query)))
    // what can I say about the line below? shit happens at MAL API
    .then(filter(truthy))
    .then(map(resourceToResult(type, actions)))
    .then(display)
    .then(() => hide('mal-loading'))
}

module.exports = {
  keyword,
  fn: plugin
}
