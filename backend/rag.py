"""
RAG pipeline refactored from youtube.py.
Takes transcript text, question, and OpenAI API key; returns answer.
"""
import re

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnableParallel, RunnablePassthrough, RunnableLambda
from langchain_core.output_parsers import StrOutputParser


def _format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)


def _normalize_numbered_list(text: str) -> str:
    """
    Ensure numbered list items like '1. ... 2. ... 3. ...' appear on separate lines.
    Inserts a newline before '2.', '3.', etc. when they appear inline.
    """
    return re.sub(r"\s+(?=(\d+\.\s))", "\n", text)


def build_chain(api_key: str):
    """Build the RAG chain with the given OpenAI API key (used for embeddings + LLM)."""
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small", api_key=api_key)
    llm = ChatOpenAI(model="gpt-5-nano", temperature=0.2, api_key=api_key)
    prompt = PromptTemplate(
        template="""You are a helpful assistant.
Answer ONLY from the provided transcript context.
If the context is insufficient, just say you don't know.
{context}

Question: {question}
""",
        input_variables=["context", "question"],
    )
    parser = StrOutputParser()
    return embeddings, llm, prompt, parser


def answer_question(transcript: str, question: str, api_key: str) -> str:
    """
    Run RAG on the given transcript and question using the provided OpenAI API key.
    Returns the model's answer string.
    """
    if not transcript or not transcript.strip():
        return "No transcript content available to answer from."
    if not question or not question.strip():
        return "Please ask a question."
    if not api_key or not api_key.strip():
        return "OpenAI API key is required. Add it in the extension options."

    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = splitter.create_documents([transcript])

    embeddings, llm, prompt, parser = build_chain(api_key)
    vector_store = FAISS.from_documents(chunks, embeddings)
    retriever = vector_store.as_retriever(search_type="similarity", search_kwargs={"k": 4})

    parallel_chain = RunnableParallel(
        {"context": retriever | RunnableLambda(_format_docs), "question": RunnablePassthrough()}
    )
    main_chain = parallel_chain | prompt | llm | parser

    raw = main_chain.invoke(question)
    return _normalize_numbered_list(raw)
