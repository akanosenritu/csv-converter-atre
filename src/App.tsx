import './App.css'
import {useDropzone} from "react-dropzone"
import {parse} from "csv-parse/lib/sync"
import {stringify} from "csv-stringify/lib/sync"
import janData from "./final.json"

const convertCSV = async (file: File) => {
  const text = await file.text()

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
  const {acceptedFiles, getRootProps, getInputProps} = useDropzone()

  const file = acceptedFiles.length === 0? null: acceptedFiles[0]
  
  const downloadCSV = (csvData: string) => {
    const aElement = document.createElement("a")
    const tempFile = new Blob([csvData], {type: "text/plain"})
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
      <div>
        <div {...getRootProps()}>
          <input {...getInputProps()} />
          <p>Drag 'n' drop some files here, or click to select files</p>
        </div>
      </div>  
      <button onClick={onClickButton} disabled={!file}>Click to download the converted data.</button>
    </div>
  );
}

export default App;
