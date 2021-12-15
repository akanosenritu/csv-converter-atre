import janData1211 from "../jan1211.json"
import janData1216 from "../jan1216.json"
import allJanCodes from "./allJanCodes.json"

describe("test integrity of janData1211", () => {
  const TOTAL = 265
  test("ensure that all JanCodes are present in the file", () => {
    for (const janCode of allJanCodes.allJanCodes) {
      expect(janData1211.hasOwnProperty(janCode))
    }
  })

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
      expect(janData1216.hasOwnProperty(janCode))
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