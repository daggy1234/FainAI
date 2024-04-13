import getpass
import os
import json
import pathlib
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_text_splitters import CharacterTextSplitter
from langchain.docstore.document import Document
from pinecone import Pinecone
import requests
import json

AZURE_API_KEY = ""
os.environ["OPENAI_API_KEY"] = ""
os.environ["PINECONE_API_KEY"] = ""
index_name = "330ai"

def ocr(image_url: str):
# Azure endpoint and API key
    endpoint = "https://imageapis.cognitiveservices.azure.com/"
    api_key = AZURE_API_KEY
    ocr_url = endpoint + "vision/v3.2/ocr"

    headers = {
        'Ocp-Apim-Subscription-Key': api_key,
        'Content-Type': 'application/json'
    }

    data = {'url': image_url}
    response = requests.post(ocr_url, headers=headers, json=data)

    response.raise_for_status()

    analysis = response.json()

    text = []
    for region in analysis['regions']:
        for line in region['lines']:
            line_text = ' '.join([word['text'] for word in line['words']])
            text.append(line_text)

    return text





embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
vectorstore = PineconeVectorStore(index_name=index_name, embedding=embeddings)

def parse_lecture_slides_and_captions():
    file_l = os.listdir("../data-extraction/captions")
    try:
        for f in file_l:
            print(f"FILE: {f}")
            final_json_blobs = []
            with open(f"../data-extraction/captions/{f}", "r") as file:
                data = json.loads(file.read())["data"]
                for itm in data:
                    print(f"From Start: {itm['start_time']}-{itm['end_time']}")
                    doc_chunks = []
                    cap_data = itm["captions"]
                    ocr_data = ocr(itm["image"])
                    merged_data = cap_data + ocr_data
                    final_data = "\n".join(merged_data)
                    final_json_blobs.append({"data": merged_data, "image": itm["image"], "start_time": itm["start_time"], "end_time": itm["end_time"]})
                    text_splitter = CharacterTextSplitter(chunk_size=5000, chunk_overlap=0)
                    texts = text_splitter.split_text(final_data)
                    for i,chunk in enumerate(texts):
                        doc = Document(
                            page_content=chunk,
                            metadata={
                                "image": itm["image"],
                                "chunk_id": i
                            }
                        )
                        doc_chunks.append(doc)
                    vectorstore.add_documents(doc_chunks)
                with open(f"../data-extraction/post_proc/{f}", "w+") as fb:
                    fb.write(json.dumps({"data": final_json_blobs}))
    except Exception as e:
        print("ERROR OCCURED")
        print(e)
        

from langchain_community.document_loaders import PyPDFLoader

def algorithims_textbook_load():
    loader = PyPDFLoader("algorithims_textbook.pdf")
    pages = loader.load_and_split()
    print(pages[0])
    for page in pages:
        doc_chunks = []
        text_splitter = CharacterTextSplitter(chunk_size=5000, chunk_overlap=0)
        texts = text_splitter.split_documents([page])
        for i,chunk in enumerate(texts):
            doc = Document(
                page_content=chunk.page_content,
                metadata={
                    "chunk_id": i,
                    "source": chunk.metadata["source"],
                    "page": chunk.metadata["page"],
                }
            )
            doc_chunks.append(doc)
        print(doc_chunks)
        vectorstore.add_documents(doc_chunks)

def load_homeworks():
    homework_docs = os.listdir("./homework_solutions")
    for doc in homework_docs:
        print(f"Processing {doc}")
        loader = PyPDFLoader(f"./homework_solutions/{doc}")
        pages = loader.load_and_split()
        for page in pages:
            doc_chunks = []
            text_splitter = CharacterTextSplitter(chunk_size=5000, chunk_overlap=0)
            texts = text_splitter.split_documents([page])
            for i,chunk in enumerate(texts):
                doc = Document(
                    page_content=chunk.page_content,
                    metadata={
                        "chunk_id": i,
                        "source": chunk.metadata["source"],
                        "page": chunk.metadata["page"],
                    }
                )
                doc_chunks.append(doc)
            vectorstore.add_documents(doc_chunks)

load_homeworks()