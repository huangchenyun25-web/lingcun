import re,sys
EMO = re.compile('[\U0001F000-\U0001FAFF\u2600-\u27BF\u2B00-\u2BFF\u25B6\uFE0F\u200D\u20E3]')
for f in sys.argv[1:]:
    s=open(f,encoding='utf-8').read()
    lines=s.split('\n'); out=[]; n=0
    for ln in lines:
        new=EMO.sub('',ln)
        if new!=ln:
            n+=1
            # tidy: '"  ' -> '"' at string starts left by "🎒 xxx"
            new=re.sub(r'(["\'>])[ ]+(?=[^\s"\'<+])', lambda m: m.group(1), new) if False else new
        out.append(new)
    open(f,'w',encoding='utf-8').write('\n'.join(out)); print(f,n,'lines changed')
