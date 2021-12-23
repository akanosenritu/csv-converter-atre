type Datum = {
  "返品数": string,
  "販売点数": string,
  "商品コード": string,
  "商品番号"?: string,
  "販売点数 (net)"?: string,
}

type LatestSalesDataInitial = {
  status: "initial"
}
type LatestSalesDataRetrieved = {
  status: "retrieved",
  createdAt: string,
  data: Datum[] 
}
type LatestSalesDataNoData = {
  status: "noData"
}
type LatestSalesDataRetrievalFailed = {
  status: "failed"
}
type LatestSalesData = LatestSalesDataInitial | LatestSalesDataRetrieved | LatestSalesDataNoData | LatestSalesDataRetrievalFailed