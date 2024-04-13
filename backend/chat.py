from langchain.vectorstores.chroma import Chroma
from langchain_openai import ChatOpenAI
from langchain_openai import OpenAIEmbeddings
from langchain.chains import ConversationalRetrievalChain
from langchain.schema import HumanMessage, AIMessage
from langchain_pinecone import PineconeVectorStore
from contextlib import asynccontextmanager
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import os
from fastapi import FastAPI, Request, status
from pydantic import BaseModel
import logging

class Query(BaseModel):
    question: str
    history: list[dict[str, str]]


models = {}





OPENAI_API_KEY = ""
PINECONE_API_KEY = ""

os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY
os.environ["PINECONE_API_KEY"] = PINECONE_API_KEY

def make_chain():
    model = ChatOpenAI(model="gpt-4-turbo", temperature="0")
    index_name = "330ai"
    embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
    vectorstore = PineconeVectorStore(index_name=index_name, embedding=embeddings)

    vector_store = PineconeVectorStore(
       index_name=index_name, embedding=embeddings
    )

    return ConversationalRetrievalChain.from_llm(
        model,
        retriever=vector_store.as_retriever(),
        return_source_documents=True,
        # verbose=True,
    )

@asynccontextmanager
async def lifespan(app: FastAPI):
    models["chain"] = make_chain()
    yield
    models.clear()

app = FastAPI(lifespan=lifespan)

@app.get("/")
async def responda():
    return {"text": "Welcome to AI fain backend"}

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
	exc_str = f'{exc}'.replace('\n', ' ').replace('   ', ' ')
	logging.error(f"{request}: {exc_str}")
	content = {'status_code': 10422, 'message': exc_str, 'data': None}
	return JSONResponse(content=content, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)

@app.post("/query/")
async def create_query(query: Query):
    print(query)
    chain = models["chain"]
    chat_history_proc = []
    for message in query.history:
        if message["role"] == "user":
            chat_history_proc.append(HumanMessage(content=message["content"]))
        else:
            chat_history_proc.append(AIMessage(content=message["content"]))
    response = chain.invoke({"question": query.question, "chat_history": chat_history_proc})
    answer = response["answer"]
    source = response["source_documents"]
    chat_history_proc.append(HumanMessage(content=query.question))
    chat_history_proc.append(AIMessage(content=answer))
    new_hist = query.history + [{"role": "user", "content": query.question},{"role": "ai", "content": answer}]
    return {"answer": answer, "sources": [document.metadata for document in source], "chat_history": new_hist}



# if __name__ == "__main__":
#     # os.environ["OPENAI_API_KEY"] = ""
#     chain = make_chain()
#     chat_history = []

#     while True:
#         question = input("Question: ")
#         # I don't want to use history as it fixates and expects every question to be a followup
#         response = chain.invoke({"question": question, "chat_history": chat_history})
#         answer = response["answer"]
#         source = response["source_documents"]
#         chat_history.append(HumanMessage(content=question))
#         chat_history.append(AIMessage(content=answer))
#         print("\n\nSources:\n")
#         for document in source:
#             print(document.metadata)
#         print(f"Answer: {answer}")