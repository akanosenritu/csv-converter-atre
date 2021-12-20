import janData1221 from "../jan1221.json"
import allJanCodes from "./allJanCodes.json"

describe("test integrity of janData1221", () => {
  const TOTAL = 355
  test("ensure that all JanCodes are present in the file", () => {
    for (const janCode of allJanCodes.allJanCodes) {
      expect(janData1221.hasOwnProperty(janCode)).toBe(true)
    }
  })

  test("ensure that the file has numbers from 1 to TOTAL and corresponding JanCode.", () => {
    const result = Array(TOTAL).fill(false)
    for (const janCode in janData1221) {
      // @ts-ignore
      result[janData1221[janCode]-1] = true
    }
    expect(result).toEqual(Array(TOTAL).fill(true))
  })
})