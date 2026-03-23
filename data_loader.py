from openai import OpenAI
from llama_index.readers.file import PDFReader
from llama_index.core.node_parser import SentenceSplitter
from dotenv import load_dotenv
import os
load_dotenv()

client = OpenAI()

reader = PDFReader()
EMBED_MODEL = "text-embedding-3-large"
EMBED_DIM = 3072

splitter = SentenceSplitter(chunk_size=1000 , chunk_overlap=200)

def load_and_chunk_pdf(path : str):
    docs = PDFReader().load_data(file=path)
    chunks = []
    text = [d.text for d in docs if getattr(d , "text" , None)]
    for t in text :
        chunks.extend(splitter.split_text(t))
    return chunks

def embed_texts(texts :list[str])->list[list[float]]:
    response = client.embeddings.create(input=texts , model=EMBED_MODEL)
    return  [e.embedding for e in response.data]