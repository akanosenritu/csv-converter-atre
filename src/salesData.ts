export const retrieveLatestSalesData = async (): Promise<LatestSalesData> => {
  // get information of the latest data
  const res = await fetch("https://atre2.azurewebsites.net/api/getlatestsalesdata")
  if (!res.ok) {
    return {status: "failed"}
  }
  const data = await res.json()
  if (data.status === "noData") {
    return {status: "noData"}
  }

  // retrieve the actual data with the url provided.
  const res2 = await fetch(data.url)
  if (!res2.ok) {
    return {status: "failed"}
  }
  const data2 = await res2.json()
  return {
    status: "retrieved",
    createdAt: data2.createdAt,
    data: data2.data
  }
}