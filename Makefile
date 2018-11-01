KNAME := $(shell uname)
ifeq (Darwin,$(findstring Darwin,$(KNAME)))
    CPP=g++-7
else
    CPP=/usr/bin/cpp
endif

SRC=core/src/rasters.cpp
INC:=$(shell find core/inc/ -name "*.hpp") 
OUT=postcompiled/utils/Rasters.cpp.js postcompiled/utils/Rasters.js postcompiled/view/FragmentShaders.js postcompiled/view/VertexShaders.js

all: $(OUT)

run:
	emrun --browser chrome postcompiled/utils/Rasters.cpp.html
test:
	emrun --browser chrome test.cpp.html

postcompiled/utils/Rasters.cpp.js : $(INC) $(SRC)
	em++ --emrun --bind --profiling-funcs -std=c++17 \
	-I core/inc/ \
	-g core/src/rasters.cpp \
	-s EXPORT_NAME="'Rasters'" -s MODULARIZE=1 \
	-s WASM=1 -s DEMANGLE_SUPPORT=1 -s ASSERTIONS=1 -s SAFE_HEAP=1 \
	-s ALLOW_MEMORY_GROWTH=1 \
	-o postcompiled/utils/Rasters.cpp.html
	# -g4 \
	# -Werror \
	# -g core/src/*.cpp \

postcompiled/utils/Rasters.js : precompiled/utils/Rasters.js
	$(CPP) -E -P -I. -xc -Wundef -std=c99 -nostdinc -Wtrigraphs -fdollars-in-identifiers -C $< > $@

postcompiled/view/FragmentShaders.js : precompiled/view/fragment/FragmentShaders.template.js
	cat $< | \
    sed '/GENERIC.GLSL.C/ r precompiled/view/fragment/generic.glsl.c' | \
    sed '/REALISTIC.GLSL.C/ r precompiled/view/fragment/realistic.glsl.c' | \
    sed '/DEBUG.GLSL.C/ r precompiled/view/fragment/debug.glsl.c' | \
    sed '/VECTOR_FIELD.GLSL.C/ r precompiled/view/fragment/vector_field.glsl.c' \
    > postcompiled/view/FragmentShaders.js

postcompiled/view/VertexShaders.js : precompiled/view/vertex/VertexShaders.template.js
	cat $< | \
    sed '/TEMPLATE.GLSL.C/ r precompiled/view/vertex/template.glsl.c' | \
    sed '/EQUIRECTANGULAR.GLSL.C/ r precompiled/view/vertex/equirectangular.glsl.c' | \
    sed '/TEXTURE.GLSL.C/ r precompiled/view/vertex/texture.glsl.c' | \
    sed '/ORTHOGRAPHIC.GLSL.C/ r precompiled/view/vertex/orthographic.glsl.c' \
    > postcompiled/view/VertexShaders.js

clean:
	rm -f $(OUT)
