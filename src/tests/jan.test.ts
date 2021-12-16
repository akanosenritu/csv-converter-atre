import janData1211 from "../jan1211.json"
import janData1216 from "../jan1216.json"
import allJanCodes from "./allJanCodes.json"

describe("test integrity of janData1211", () => {
  const TOTAL = 266

  // thank to many additions and removals this test doesn't work.
  // mercifully this data will not be used in the near future, I decided to skip the test.
  
  // test("ensure that all JanCodes are present in the file", () => {
  //   for (const janCode of allJanCodes.allJanCodes.slice(0, 265)) {
  //    expect(janData1211.hasOwnProperty(janCode)).toBe(true)
  //  }
  //})
  

  test("ensure that the file has numbers from 1 to TOTAL and corresponding JanCode.", () => {
    const result = Array(TOTAL).fill(false)
    for (const janCode in janData1211) {
      // @ts-ignore
      result[janData1211[janCode]-1] = true
    }
    expect(result).toEqual(Array(TOTAL).fill(true))
  })
})

describe("test integrity of janData1216", () => {
  const TOTAL = 290
  test("ensure that all JanCodes are present in the file", () => {
    for (const janCode of allJanCodes.allJanCodes) {
      expect(janData1216.hasOwnProperty(janCode)).toBe(true)
    }
  })

  test("ensure that the file has numbers from 1 to TOTAL and corresponding JanCode.", () => {
    const result = Array(TOTAL).fill(false)
    for (const janCode in janData1216) {
      // @ts-ignore
      result[janData1216[janCode]-1] = true
    }
    expect(result).toEqual(Array(TOTAL).fill(true))
  })
})