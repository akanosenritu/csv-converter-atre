import './App.css'
import {useDropzone} from "react-dropzone"
import {parse} from "csv-parse/lib/sync"
import {stringify} from "csv-stringify/lib/sync"
import janData from "./final.json"
import iconv from "iconv-lite"


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

const convertCSV = async (file: File) => {
  const text = await myReadFileAsText(file, "Shift-jis")

  // parse the data with csv library
  const data: {[key: string]: string}[] = parse(text, {columns: true})

  // add "Item code" to the data by looking up final.json
  // calculate the actual number of items sold 
  const modifiedData = data.map(datum => {
    const newDatum = {...datum}
    newDatum["商品番号"] = "Not found"
    newDatum["販売点数 (net)"] = "Error" 
    // @ts-ignore
    if (janData[datum["商品コード"]]) {
      // @ts-ignore
      newDatum["商品番号"] = janData[datum["商品コード"]]
    }
    newDatum["販売点数 (net)"] = (parseFloat(datum["販売点数"]) - parseFloat(datum["返品数"])).toString(10)
    return newDatum
  })

  // generate required item numbers
  const order1 = Array(31).fill(0).map((elem, index) => "新" + (index+1).toString())
  const order2 = Array(233).fill(0).map((elem, index) => (index+1).toString())
  const requiredItemNumbers = order1.concat(order2)
  
  // insert placeholders in the place of an item if no data was provided by POS 
  const tempData: any[] = []
  for (const num of requiredItemNumbers) {
    const index = modifiedData.findIndex(datum => datum["商品番号"] === num)
    if (index === -1) tempData.push({"商品番号": num.toString()})
    else tempData.push(modifiedData[index])
  }

  // items that don't have an item-number associated with them
  const notFound = modifiedData.filter(datum => datum["商品番号"] === "Not found")

  // joint them
  const finalData = tempData.concat(notFound)

  // stringify the data
  return stringify(finalData, {
    header: true,
    columns: [{key: "商品番号"}, {key: "商品コード"}, {key: "商品名"}, {key: "部門名"}, {key: "純売上"}, {key: "純売上(税抜)"}, {key: "消費税"}, {key: "原価"}, {key: "純売上構成比"}, {key: "販売点数"}, {key: "返品数"}, {key: "販売点数 (net)"}, {key: "販売点数構成比"}, {key: "在庫数"}]
  })
}



function App() {
  const {acceptedFiles, getRootProps, getInputProps} = useDropzone({})
  const file = acceptedFiles.length === 0? null: acceptedFiles[0]
  
  const downloadCSV = (csvData: string) => {
    const aElement = document.createElement("a")
    const tempFile = new Blob([iconv.encode(csvData, "Shift_JIS")], {type: "text/plain"})
    aElement.href = URL.createObjectURL(tempFile)
    aElement.download = file? file.name : "newfile.csv"
    document.body.appendChild(aElement)    
    aElement.click()
  }

  const onClickButton = async () => {
    if (file) {
      const data = await convertCSV(file)
      console.log(data)
      downloadCSV(data)
    }
  }

  return (
    <div className="App">
      <div style={{border: "3px dotted black", borderRadius: 20, margin: 20}}>
        <div {...getRootProps()}>
          <input {...getInputProps()} />
          <p>
            ここにファイルをドロップするか、クリックしてファイルを選択してください。
          </p>
        </div>
      </div>  
      <div>
        <button onClick={onClickButton} disabled={!file}>ダウンロード</button>
      </div>
      <div style={{width: "60%", margin: "auto", textAlign:"left"}}>
        <ul>
          <li>スマレジからダウンロードするときに"Windows (shift-jis)"を選択したファイルを使用してください</li>
          <li>ダウンロードされたファイルはWindows向けに作成されています。Macで開くと文字化けが起こります。</li>
        </ul>  
      </div>
    </div>
  );
}

export default App;
