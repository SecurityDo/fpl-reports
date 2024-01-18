/**
 * @file BehaviorSummaryReport
 * @reportoverview An executive summary report that shows the behavior, key and level events over a time range and
 * the top behavior rules by hits.
 */

/**
 * Main method. This method breaks the time range into 1 day intervals and gets the behavior events for each day.
 * The overall table is then broken down into smaller tables based on the behavior, key and level.
 * 
 * @param {string || int} from - The start of the time range. Default is 1 day ago from the past hour
 * @param {string || int} to - The end of the time range. Default is the past minute
 * 
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({from="-1d@m", to="@m"}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to)
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)

  let events = new Table()

  // breaks the time down into 1 day intervals and gets the activity timeline for each day
  let interval = "1d"
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
    let from = t
    let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
    let table = Fluency_SummarySearch("riskScore: [4000 TO *]", from.UnixMilli(), to.UnixMilli(), (obj) => {
      let {dayIndex, behaviors, riskScore, key, keyType, summaryList } = obj
      let behaviorRules = []
      let behaviorRulesCount = []
      // parses each behavior rule hit and count as new columns
      for (let i = 0; i < len(summaryList); i++) {
        let summary = summaryList[i]
        // only add events with a risk score
        if (summary.riskScore > 0) {
          behaviorRules = append(behaviorRules, summary.behaviorRule)
          behaviorRulesCount = append(behaviorRulesCount, (summary.count))
        }
      }
      return {dayIndex, riskScore, key, keyType, behaviors, behaviorRules, behaviorRulesCount}
    })
    events.Append(table)
  }
  // creates a new level column based on the risk score
  events.NewColumnLambda("level", "", ({riskScore}) => {
    return riskScore >= 6000 ? (riskScore < 8000 ? "serious" : "critical") : "high"
  })

  // gets the list of behavior values
  let behaviors = []
  try {
    let behaviorValues = events.GetColumnValues("behaviors")
    for (let i = 0; i < len(behaviorValues); i++) {
      for (let j = 0; j < len(behaviorValues[i]); j++) {
        let value = behaviorValues[i][j]
        if (!behaviors.Some((_, e) => e.behavior == value)) {
          behaviors = append(behaviors, {behavior: value, count: 1})
        } else {
          let behavior = behaviors.Find((_, e) => e.behavior == value)
          behavior.count++
        }
      }
    }
    behaviors = jsonTable(behaviors)
  } catch (e) {
    // return empty table
    behaviors = new Table()
  }

  // aggregate the table by key
  let keys = events.Aggregate(({keyType}) => {
    return {
      groupBy: {key: keyType},
      columns: {
        count: {count: true}
      }
    }
  })

  // aggregates the table by level and day index
  let levels = events.Clone()
  let dayAverage = events.Clone()
  // aggregates the table by level and if the time range is more than 2 months, it will aggregate by month instead of day
  if (rangeTo.After(rangeFrom.Add("60d"))) {
    levels = levels.Aggregate(({level, dayIndex}) => {
      let dayIndex = subString(dayIndex, 0, 6) + "01"
      return {
        groupBy: {level, dayIndex},
        columns: {
          count: {count: true}
        }
      }
    })
    // gets the average level for each month
    dayAverage = dayAverage.Aggregate(({dayIndex, riskScore}) => {
      let dayIndex = subString(dayIndex, 0, 6) + "01"
      return {
        groupBy: {dayIndex},
        columns: {
          avg: {average: riskScore}
        }
      }
    })
  } else {
    levels = levels.Aggregate(({level, dayIndex}) => {
      return {
        groupBy: {level, dayIndex},
        columns: {
          count: {count: true}
        }
      }
    })
    // gets the average level for each day
    dayAverage = dayAverage.Aggregate(({dayIndex, riskScore}) => {
      return {
        groupBy: {dayIndex},
        columns: {
          avg: {average: riskScore}
        }
      }
    })
  }
  // sorts the tables by day index
  levels = levels.Sort(0, "+dayIndex")
  dayAverage = dayAverage.Sort(0, "+dayIndex")

  // gets the top behavior rules by hits
  let topBehaviorRules = []
  try {
    let hits = events.GetColumnValues("behaviorRules")
    let hitsCount = events.GetColumnValues("behaviorRulesCount")
    for (let i = 0; i < len(hits); i++) {
      for (let j = 0; j < len(hits[i]); j++) {
        let hit = hits[i][j]
        let hitCount = hitsCount[i][j]
        if (!topBehaviorRules.Some((_, e) => e.behaviorRule == hit)) {
          topBehaviorRules = append(topBehaviorRules, {behaviorRule: hit, count: hitCount})
        } else {
          let behaviorRuleHit = topBehaviorRules.Find((_, e) => e.behaviorRule == hit)
          behaviorRuleHit.count += hitCount
        }
      }
    }
    topBehaviorRules = jsonTable(topBehaviorRules).Sort(10, "-count")
  } catch (e) {
    // return empty table
    topBehaviorRules = new Table()
  }

  return {
    behaviors,
    keys,
    levels,
    topBehaviorRules,
    dayAverage
  }
}

/**
 * Thie method is a helper method to validate the time range passed by the user.
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * 
 * @returns {boolean} - Returns true if the time range is valid
 */
function validateTimeRange(from, to) {
  // checks to see if the start of the time range is after the end of the time range
  if (from.After(to)) {
      throw new Error("rangeFrom must be less than rangeTo", "RangeError")
  }
  return true
}
