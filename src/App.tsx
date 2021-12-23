import './App.css'
import {useEffect, useState} from "react"
import {useDropzone} from "react-dropzone"
import {parse} from "csv-parse/lib/sync"
import {stringify} from "csv-stringify/lib/sync"
import janData1221 from "./jan1221.json"
import janDataTanaka from "./janTanaka.json"
import iconv from "iconv-lite"
import { retrieveLatestSalesData } from './salesData'

// promisified fileReader, this was needed to specify 
// the encoding of the input file (shift-jis).
// source: https://blog.shovonhasan.com/using-promises-with-filereader/
const myReadFileAsText = (inputFile: File, encoding: string): Promise<string> => {
  const temporaryFileReader = new FileReader();

  return new Promise((resolve, reject) => {
    temporaryFileReader.onerror = () => {
      temporaryFileReader.abort();
      reject(new DOMException("Problem parsing input file."));
    };

    temporaryFileReader.onload = () => {
      resolve(temporaryFileReader.result as string);
    };
    temporaryFileReader.readAsText(inputFile, encoding);
  })
}

const calculateItemsSold = (datum: {"販売点数": string, "返品数": string}) => {
  if (datum["販売点数"] && datum["返品数"]) return (parseFloat(datum["販売点数"]) - parseFloat(datum["返品数"])).toString(10)
  return ""
}

const readCSV = async (file: File) => {
  const text = await myReadFileAsText(file, "Shift-jis")

  // parse the data with csv library
  const data: {[key: string]: string}[] = parse(text, {columns: true})
  return data as Datum[]
}

const addItemNumber = (datum: Datum, janDataSource: "1221" | "tanaka") => {
  const janData = janDataSource === "1221" ? janData1221: janDataTanaka
  const newDatum = {...datum}
  newDatum["商品番号"] = "Not found"
  newDatum["販売点数 (net)"] = "Error" 
  // @ts-ignore
  if (janData[datum["商品コード"]]) {
    // @ts-ignore
    newDatum["商品番号"] = janData[datum["商品コード"]].toString()
  }
  return newDatum
}

const convertCSV = async (file: File, janData: "1221" | "tanaka") => {
  const data = await readCSV(file)

  // add "Item code" to the data by looking up final.json
  // calculate the actual number of items sold 
  const modifiedData = data.map(datum => {
    const newDatum = addItemNumber(datum, janData)
    newDatum["販売点数 (net)"] = calculateItemsSold(datum)
    return newDatum
  })

  // generate required item numbers
  // for janData1216: 290
  // for janDataTanaka: 290
  const numberOfItems = janData === "tanaka"? 290: 355
  const requiredItemNumbers = Array(numberOfItems).fill(0).map((elem, index) => index+1)
  
  // insert placeholders in the place of an item if no data was provided by POS 
  const tempData: any[] = []
  for (const num of requiredItemNumbers) {
    const index = modifiedData.findIndex(datum => datum["商品番号"] === num.toString())
    if (index === -1) tempData.push({"商品番号": num.toString()})
    else tempData.push(modifiedData[index])
  }

  // items that don't have an item-number associated with them
  const notFound = modifiedData.filter(datum => datum["商品番号"] === "Not found")

  // joint them
  const finalData = tempData.concat(notFound)

  return finalData
}

const stringifyCSV = (data: Datum[]) => {
  return stringify(data, {
    header: true,
    columns: [{key: "商品番号"}, {key: "商品コード"}, {key: "商品名"}, {key: "部門名"}, {key: "純売上"}, {key: "純売上(税抜)"}, {key: "消費税"}, {key: "原価"}, {key: "純売上構成比"}, {key: "販売点数"}, {key: "返品数"}, {key: "販売点数 (net)"}, {key: "販売点数構成比"}, {key: "在庫数"}]
  })
}

function App() {
  // autoDownloadedLatestSalesData: for 売上管理表1220更新 .xlsx, use the latest file on Azure storage
  const [autoDownloadedLatestSalesData, setAutoDownloadedLatestSalesData] = useState<LatestSalesData>({
    status: "initial"
  })

  // convertedData2: for 売上管理表1220更新 .xlsx, use the uploaded file by the user. 
  const [convertedData2, setConvertedData2] = useState<Datum[]|null>(null)

  // load the latest file from azure storage
  // only run it initially
  useEffect(() => {
    retrieveLatestSalesData()
      .then(result => setAutoDownloadedLatestSalesData(result))
  }, [])

  // only accept the first of the uploaded files.
  const filterFiles = (acceptedFiles: File[]) => {
    return acceptedFiles.length === 0? null: acceptedFiles[0]
  }
  const {acceptedFiles, getRootProps, getInputProps} = useDropzone({
    onDrop: (files) => {
      const file = filterFiles(files)
      if (file) {
        convertCSV(file, "1221")
          .then(data => setConvertedData2(data))
      }   
    }    
  })
  const file = acceptedFiles.length === 0? null: acceptedFiles[0]
  
  const downloadCSV = (csvData: string) => {
    const aElement = document.createElement("a")
    const tempFile = new Blob([iconv.encode(csvData, "Shift_JIS")], {type: "text/plain"})
    aElement.href = URL.createObjectURL(tempFile)
    aElement.download = file? file.name : "newfile.csv"
    document.body.appendChild(aElement)    
    aElement.click()
  }

  // for the auto downloaded file, janData1221
  const onClickDownloadButton1221AzureStorage = async () => {
    if (autoDownloadedLatestSalesData.status === "retrieved") {
      downloadCSV(stringifyCSV(autoDownloadedLatestSalesData.data))
    }
  }
  const onClickCopyButton1221AzureStorage = async () => {
    if (autoDownloadedLatestSalesData.status === "retrieved") {
      // the last element is excluded because it is the sum.
      const salesData = autoDownloadedLatestSalesData.data.map(datum => calculateItemsSold(datum)).slice(0, -1)
      navigator.clipboard.writeText(salesData.join("\n"))
    }
  }

  // for self uploaded, janData1221
  const onClickDownloadButton1221 = async () => {
    if (convertedData2) {
      downloadCSV(stringifyCSV(convertedData2))
    }
  }
  const onClickCopyButton1221 = async () => {
    if (convertedData2) {
      // the last element is excluded because it is the sum.
      const salesData = convertedData2.map(datum => calculateItemsSold(datum)).slice(0, -1)
      navigator.clipboard.writeText(salesData.join("\n"))
    }
  }

  return (
    <div className="App">
      <div id="useAutoDownloadedData">
        <p className='title'>自動ダウンロードされたデータを使用する (実験的)</p>
        <p className='description'>
          スマレジ上から自動的にダウンロードされたデータを使用します。データは10時から21時の間、1時間おきに自動的にダウンロードされ、クラウド上に保存されています。保存されているデータのうち、最新のデータが使用されます。<br />
          スマレジの締め時間の設定によっては、昨日のデータが使用される場合があります。例えば初期状態では締め時間は4時に設定されているため、0時からその日の最初の売上が記録されるまでは、昨日のデータが最新のデータとして使用されます。これは締め時間を0時に設定することで解消できます。
        </p>
        <div style={{display: "flex", margin: 5, justifyContent: "center"}}>
          <div>
            {autoDownloadedLatestSalesData.status === "initial" && "データをダウンロード中です"}
            {autoDownloadedLatestSalesData.status === "noData" && "データが見つかりませんでした"}
            {autoDownloadedLatestSalesData.status === "retrieved" && `データの作成時刻: ${autoDownloadedLatestSalesData.createdAt}`}
            {autoDownloadedLatestSalesData.status === "failed" && "データのダウンロードに失敗しました"}
          </div>
        </div>
        <div style={{display: "flex", margin: 5}}>
          <div style={{width: "50%"}}>売上管理表1221更新.xlsx 用</div>
          <div style={{display: "flex", justifyContent: "space-around", width: "50%"}}>
            <button onClick={onClickDownloadButton1221AzureStorage} disabled={!(autoDownloadedLatestSalesData.status==="retrieved")}>ダウンロード</button>
            <button onClick={onClickCopyButton1221AzureStorage} disabled={!(autoDownloadedLatestSalesData.status==="retrieved")}>クリップボードにコピー</button>
          </div>
        </div>
        <div style={{width: "90%", margin: "auto", textAlign:"left", fontSize: 12}}>
          <ul>
            <li>ダウンロードされたファイルはWindows向けに作成されています。Macで開くと文字化けが起こります。</li>
            <li>
              クリップボードにコピーをクリックすると、販売点数の列だけがクリップボードにコピーされます。
              Excel上にそのまま貼り付けることができます。
            </li>
          </ul>  
        </div>
      </div>
      <div id="useSelfDownloadedData">
        <p className='title'>自分で用意したデータを使用する</p>
        <div style={{border: "3px dotted black", borderRadius: 20, margin: 20}}>
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            <p>
              ここにファイルをドロップするか、クリックしてファイルを選択してください。
            </p>
          </div>
        </div>
        <div style={{display: "flex", margin: 5}}>
          <div style={{width: "50%"}}>売上管理表1221更新.xlsx 用</div>
          <div style={{display: "flex", justifyContent: "space-around", width: "50%"}}>
            <button onClick={onClickDownloadButton1221} disabled={!convertedData2}>ダウンロード</button>
            <button onClick={onClickCopyButton1221} disabled={!convertedData2}>クリップボードにコピー</button>
          </div>
        </div>
        <div style={{width: "90%", margin: "auto", textAlign:"left", fontSize: 12}}>
          <ul>
            <li>スマレジからダウンロードするときに"Windows (shift-jis)"を選択したファイルを使用してください</li>
            <li>ダウンロードされたファイルはWindows向けに作成されています。Macで開くと文字化けが起こります。</li>
            <li>
              クリップボードにコピーをクリックすると、販売点数の列だけがクリップボードにコピーされます。
              Excel上にそのまま貼り付けることができます。
            </li>
          </ul>  
        </div>
      </div>
      <div id="changelog">
        <p className='title'>変更履歴</p>
        <p className='description'>最新の履歴が一番上に表示されます。</p>
        <div>
          <div style={{marginTop: 10, textAlign: "left", fontSize: 12}}>
            <p>
              2021/12/24 02:00<br />
              <ul>
                <li>「ごちうさアトレ2021最終在庫報告用.xlsx」用を削除。</li>
                <li>自動ダウンロードされたデータを使用する機能を追加。</li>
              </ul>
            </p>
            <p>
              2021/12/21 01:30<br />
              <ul>
                <li>「【ごちうさ】売上管理表1220更新 .xlsx」に対応。</li>
                <ul>
                  <li>289番「アクリル時計＜flight attendant＞」(4573189369979)以降に新規商品65点を追加。</li>
                  <li>末尾に「レジ袋」(123456789012, 旧290番-&gt;新355番) を移動。</li>
                  <li>総登録数355点。</li>
                </ul>
                <li>「【ごちうさ】売上管理表1216更新 .xlsx」用を削除。</li>
              </ul>
            </p>
            <p>
              2021/12/18 14:00<br />
              <ul>
                <li>「ごちうさアトレ2021最終在庫報告用.xlsx」に対応。</li>
              </ul>
            </p>
            <p>
              2021/12/16 17:00<br />
              <ul>
                <li>「【ごちうさ】売上管理表1216更新 .xlsx」に対応。</li>
                <ul>
                  <li>旧94番「ご当地ティッピーTシャツ-REVIVAL-」(4573190000000)を削除。それに伴い旧95番以降は1番ずつ移動。(ex. 95-&lt;94)</li>
                  <li>旧265番「クリアファイル3枚セット＜ご注文はオーケストラですか？＞」(4573189373198) 以降に新規商品25点を追加。</li>
                  <li>末尾に「レジ袋」(123456789012) を追加。</li>
                  <li>総登録数290点。</li>
                </ul>
              </ul>
            </p>
            <p>
              2021/12/16 17:00<br />
              <ul>
                <li>「【ごちうさ】売上管理表1216更新 .xlsx」に対応。</li>
                <ul>
                  <li>旧94番「ご当地ティッピーTシャツ-REVIVAL-」(4573190000000)を削除。それに伴い旧95番以降は1番ずつ移動。(ex. 95-&lt;94)</li>
                  <li>旧265番「クリアファイル3枚セット＜ご注文はオーケストラですか？＞」(4573189373198) 以降に新規商品25点を追加。</li>
                  <li>末尾に「レジ袋」(123456789012) を追加。</li>
                  <li>総登録数290点。</li>
                </ul>
              </ul>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
